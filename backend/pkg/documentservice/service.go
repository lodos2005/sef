package documentservice

import (
	"context"
	"fmt"
	"sef/app/entities"
	"sef/pkg/chunking"
	"sef/pkg/ollama"
	"sef/pkg/qdrant"

	"github.com/gofiber/fiber/v3/log"
	"gorm.io/gorm"
)

const GlobalCollectionName = "global_documents"

// DocumentService handles document processing and embedding
type DocumentService struct {
	DB           *gorm.DB
	QdrantClient *qdrant.QdrantClient
}

// NewDocumentService creates a new document service
func NewDocumentService(db *gorm.DB, qdrantURL string) *DocumentService {
	return &DocumentService{
		DB:           db,
		QdrantClient: qdrant.NewQdrantClient(qdrantURL),
	}
}

// GetEmbeddingProvider returns the configured embedding provider
func (ds *DocumentService) GetEmbeddingProvider(ctx context.Context) (*entities.Provider, string, error) {
	var setting entities.Settings
	if err := ds.DB.Where("key = ?", "embedding_provider_id").First(&setting).Error; err != nil {
		return nil, "", fmt.Errorf("embedding provider not configured: %w", err)
	}

	var provider entities.Provider
	if err := ds.DB.First(&provider, setting.Value).Error; err != nil {
		return nil, "", fmt.Errorf("embedding provider not found: %w", err)
	}

	// Get embedding model from settings
	var modelSetting entities.Settings
	if err := ds.DB.Where("key = ?", "embedding_model").First(&modelSetting).Error; err != nil {
		return &provider, "", fmt.Errorf("embedding model not configured: %w", err)
	}

	return &provider, modelSetting.Value, nil
}

// GetVectorSize returns vector size for the configured model
func (ds *DocumentService) GetVectorSize(ctx context.Context) (int, error) {
	var setting entities.Settings
	if err := ds.DB.Where("key = ?", "embedding_vector_size").First(&setting).Error; err != nil {
		return 768, nil // Default
	}

	var size int
	fmt.Sscanf(setting.Value, "%d", &size)
	return size, nil
}

// ProcessDocument chunks and embeds a document
func (ds *DocumentService) ProcessDocument(ctx context.Context, document *entities.Document) error {
	// Update status to processing
	document.Status = "processing"
	if err := ds.DB.Save(document).Error; err != nil {
		return fmt.Errorf("failed to update document status: %w", err)
	}

	log.Infof("Processing document ID %d", document.ID)

	// Get embedding provider and model
	provider, embedModel, err := ds.GetEmbeddingProvider(ctx)
	if err != nil {
		document.Status = "failed"
		ds.DB.Save(document)
		return err
	}

	// Get vector size
	vectorSize, err := ds.GetVectorSize(ctx)
	if err != nil {
		document.Status = "failed"
		ds.DB.Save(document)
		return err
	}

	// Create Ollama client for this provider
	ollamaClient := ollama.NewOllamaClient(provider.BaseURL)

	// Ensure global collection exists
	exists, err := ds.QdrantClient.CollectionExists(GlobalCollectionName)
	if err != nil {
		return fmt.Errorf("failed to check collection: %w", err)
	}

	log.Infof("Ensuring Qdrant collection '%s' exists", GlobalCollectionName)

	if !exists {
		if err := ds.QdrantClient.CreateCollection(GlobalCollectionName, vectorSize, "Cosine"); err != nil {
			return fmt.Errorf("failed to create collection: %w", err)
		}
	}

	log.Infof("Chunking document ID %d", document.ID)
	// Chunk the document
	chunks := chunking.ChunkText(document.Content, chunking.DefaultStrategy())
	document.ChunkCount = len(chunks)

	log.Infof("Document ID %d chunked into %d chunks", document.ID, len(chunks))

	// Generate embeddings for chunks
	var points []qdrant.Point
	for _, chunk := range chunks {
		log.Infof("Generating embedding for document ID %d, chunk %d", document.ID, chunk.Index)
		embedding, err := ollamaClient.GenerateEmbedding(ctx, embedModel, chunk.Text)
		if err != nil {
			document.Status = "failed"
			ds.DB.Save(document)
			return fmt.Errorf("failed to generate embedding for chunk %d: %w", chunk.Index, err)
		}

		point := qdrant.Point{
			ID:     fmt.Sprintf("%d_%d", document.ID, chunk.Index),
			Vector: embedding,
			Payload: map[string]interface{}{
				"document_id": document.ID,
				"chunk_index": chunk.Index,
				"text":        chunk.Text,
				"title":       document.Title,
			},
		}

		points = append(points, point)
	}

	log.Infof("Generated %d embeddings for document ID %d", len(points), document.ID)

	// Upsert points to Qdrant
	if err := ds.QdrantClient.UpsertPoints(GlobalCollectionName, points); err != nil {
		document.Status = "failed"
		ds.DB.Save(document)
		return fmt.Errorf("failed to upsert points: %w", err)
	}

	log.Infof("Upserted %d points to Qdrant for document ID %d", len(points), document.ID)

	// Update document status
	document.Status = "ready"
	if err := ds.DB.Save(document).Error; err != nil {
		return fmt.Errorf("failed to update document status: %w", err)
	}

	return nil
}

// SearchDocuments performs semantic search across documents
func (ds *DocumentService) SearchDocuments(ctx context.Context, query string, limit int, filter map[string]interface{}) ([]qdrant.SearchResult, error) {
	// Get embedding provider and model
	provider, embedModel, err := ds.GetEmbeddingProvider(ctx)
	if err != nil {
		return nil, err
	}

	// Create Ollama client
	ollamaClient := ollama.NewOllamaClient(provider.BaseURL)

	// Generate embedding for query
	queryEmbedding, err := ollamaClient.GenerateEmbedding(ctx, embedModel, query)
	if err != nil {
		return nil, fmt.Errorf("failed to generate query embedding: %w", err)
	}

	// Search in Qdrant global collection
	results, err := ds.QdrantClient.Search(GlobalCollectionName, queryEmbedding, limit, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to search: %w", err)
	}

	return results, nil
}

// DeleteDocument removes a document and its embeddings
func (ds *DocumentService) DeleteDocument(ctx context.Context, document *entities.Document) error {
	// Delete points from Qdrant
	filter := map[string]interface{}{
		"must": []map[string]interface{}{
			{
				"key": "document_id",
				"match": map[string]interface{}{
					"value": document.ID,
				},
			},
		},
	}

	if err := ds.QdrantClient.DeletePoints(GlobalCollectionName, filter); err != nil {
		return fmt.Errorf("failed to delete points: %w", err)
	}

	// Delete from database
	if err := ds.DB.Delete(document).Error; err != nil {
		return fmt.Errorf("failed to delete document: %w", err)
	}

	return nil
}

// GetRelevantContext retrieves relevant document chunks for a query with document metadata
func (ds *DocumentService) GetRelevantContext(ctx context.Context, query string, documentIDs []uint, limit int) ([]qdrant.SearchResult, error) {
	if len(documentIDs) == 0 {
		return []qdrant.SearchResult{}, nil
	}

	// Build filter for specific documents
	shouldFilters := []map[string]interface{}{}
	for _, docID := range documentIDs {
		shouldFilters = append(shouldFilters, map[string]interface{}{
			"key": "document_id",
			"match": map[string]interface{}{
				"value": docID,
			},
		})
	}

	filter := map[string]interface{}{
		"should": shouldFilters,
	}

	// Search for relevant chunks
	results, err := ds.SearchDocuments(ctx, query, limit, filter)
	if err != nil {
		return nil, err
	}

	return results, nil
}
