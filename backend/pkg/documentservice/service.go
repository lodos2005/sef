package documentservice

import (
	"context"
	"fmt"
	"sef/app/entities"
	"sef/pkg/chunking"
	"sef/pkg/providers"
	"sef/pkg/qdrant"
	"strings"

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

	// Create embedding provider
	factory := &providers.EmbeddingProviderFactory{}
	config := map[string]interface{}{
		"base_url": provider.BaseURL,
		"api_key":  provider.ApiKey,
	}

	embedProvider, err := factory.NewProvider(provider.Type, config)
	if err != nil {
		document.Status = "failed"
		ds.DB.Save(document)
		return fmt.Errorf("failed to create embedding provider: %w", err)
	}

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

	// Auto-detect best chunking strategy based on document characteristics
	strategy := ds.detectChunkingStrategy(document)
	log.Infof("Using %s chunking strategy for document ID %d", strategy, document.ID)

	// Chunk the document with detected strategy
	var chunks []chunking.Chunk
	if strategy == "smart" {
		chunks = chunking.ChunkWithHeaders(document.Content, chunking.SmartStrategy())
	} else {
		chunks = chunking.ChunkText(document.Content, chunking.DefaultStrategy())
	}
	document.ChunkCount = len(chunks)

	log.Infof("Document ID %d chunked into %d chunks", document.ID, len(chunks))

	// Generate embeddings for chunks
	var points []qdrant.Point
	totalChunks := len(chunks)
	for _, chunk := range chunks {
		log.Infof("Generating embedding for document ID %d, chunk %d", document.ID, chunk.Index)
		embedding, err := embedProvider.GenerateEmbedding(ctx, embedModel, chunk.Text)
		if err != nil {
			document.Status = "failed"
			ds.DB.Save(document)
			return fmt.Errorf("failed to generate embedding for chunk %d: %w", chunk.Index, err)
		}

		// Calculate relative position for better context awareness
		relativePosition := float64(chunk.Index) / float64(totalChunks)

		point := qdrant.Point{
			ID:     fmt.Sprintf("%d_%d", document.ID, chunk.Index),
			Vector: embedding,
			Payload: map[string]interface{}{
				"document_id":       document.ID,
				"chunk_index":       chunk.Index,
				"text":              chunk.Text,
				"title":             document.Title,
				"char_count":        len(chunk.Text),
				"relative_position": relativePosition, // Where in document (0.0-1.0)
				"total_chunks":      totalChunks,
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

	// Create embedding provider
	factory := &providers.EmbeddingProviderFactory{}
	config := map[string]interface{}{
		"base_url": provider.BaseURL,
		"api_key":  provider.ApiKey,
	}

	embedProvider, err := factory.NewProvider(provider.Type, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create embedding provider: %w", err)
	}

	// Generate embedding for query
	queryEmbedding, err := embedProvider.GenerateEmbedding(ctx, embedModel, query)
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

// preprocessQuery normalizes and enhances the query for better semantic matching
func preprocessQuery(query string) string {
	// Trim whitespace
	query = strings.TrimSpace(query)

	// Convert to lowercase for more consistent matching
	// Note: This should match how documents are processed if they're also lowercased

	// Remove redundant whitespace
	query = strings.Join(strings.Fields(query), " ")

	return query
}

// GetRelevantContext retrieves relevant document chunks for a query with document metadata
func (ds *DocumentService) GetRelevantContext(ctx context.Context, query string, documentIDs []uint, limit int) ([]qdrant.SearchResult, error) {
	if len(documentIDs) == 0 {
		return []qdrant.SearchResult{}, nil
	}

	// Preprocess the query for better matching
	processedQuery := preprocessQuery(query)

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

	// Search for relevant chunks using processed query
	results, err := ds.SearchDocuments(ctx, processedQuery, limit, filter)
	if err != nil {
		return nil, err
	}

	return results, nil
}

// detectChunkingStrategy analyzes document content to choose optimal chunking strategy
func (ds *DocumentService) detectChunkingStrategy(document *entities.Document) string {
	content := document.Content
	title := strings.ToLower(document.Title)

	// Count indicators for structured content
	headerCount := 0
	listCount := 0
	codeBlockCount := 0
	lines := strings.Split(content, "\n")

	for i, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Check for headers (short lines followed by content)
		if len(trimmed) > 0 && len(trimmed) < 100 {
			if i < len(lines)-1 && len(strings.TrimSpace(lines[i+1])) > 0 {
				// Patterns that suggest headers
				if strings.HasSuffix(trimmed, ":") ||
					strings.HasPrefix(trimmed, "#") ||
					strings.HasPrefix(trimmed, "##") ||
					isAllUpperCase(trimmed) {
					headerCount++
				}
			}
		}

		// Check for lists
		if strings.HasPrefix(trimmed, "-") ||
			strings.HasPrefix(trimmed, "*") ||
			strings.HasPrefix(trimmed, "•") ||
			(len(trimmed) > 2 && trimmed[0] >= '0' && trimmed[0] <= '9' && (trimmed[1] == '.' || trimmed[1] == ')')) {
			listCount++
		}

		// Check for code blocks
		if strings.HasPrefix(trimmed, "```") ||
			strings.HasPrefix(trimmed, "    ") && len(trimmed) > 4 { // Indented code
			codeBlockCount++
		}
	}

	// Calculate document metrics
	lineCount := len(lines)
	avgLineLength := 0
	if lineCount > 0 {
		avgLineLength = len(content) / lineCount
	}

	// Decision logic
	structureScore := 0

	// Technical documentation indicators
	if strings.Contains(title, "doc") ||
		strings.Contains(title, "guide") ||
		strings.Contains(title, "manual") ||
		strings.Contains(title, "api") ||
		strings.Contains(title, "reference") {
		structureScore += 2
	}

	// Code/technical content indicators
	if strings.Contains(title, "code") ||
		strings.Contains(title, "tutorial") ||
		strings.Contains(title, "example") ||
		codeBlockCount > 5 {
		structureScore += 2
	}

	// High header density suggests structured content
	headerDensity := float64(headerCount) / float64(lineCount)
	if headerDensity > 0.05 { // More than 5% of lines are headers
		structureScore += 3
	} else if headerDensity > 0.02 { // More than 2% are headers
		structureScore += 1
	}

	// List density
	listDensity := float64(listCount) / float64(lineCount)
	if listDensity > 0.15 { // More than 15% are list items
		structureScore += 2
	}

	// Short average line length suggests structured content
	if avgLineLength < 60 {
		structureScore += 1
	}

	// Multiple sections/headers indicate structured document
	if headerCount > 5 {
		structureScore += 2
	}

	// Decision: Use smart strategy if structure score is high enough
	if structureScore >= 5 {
		log.Infof("Document ID %d: Detected structured content (score: %d, headers: %d, lists: %d)",
			document.ID, structureScore, headerCount, listCount)
		return "smart"
	}

	log.Infof("Document ID %d: Using standard chunking (score: %d, headers: %d, lists: %d)",
		document.ID, structureScore, headerCount, listCount)
	return "standard"
}

// isAllUpperCase checks if a string is mostly uppercase
func isAllUpperCase(s string) bool {
	if len(s) < 3 {
		return false
	}

	upperCount := 0
	letterCount := 0

	for _, r := range s {
		if (r >= 'A' && r <= 'Z') || (r >= 'a' && r <= 'z') {
			letterCount++
			if r >= 'A' && r <= 'Z' {
				upperCount++
			}
		}
	}

	if letterCount == 0 {
		return false
	}

	return float64(upperCount)/float64(letterCount) > 0.8
}
