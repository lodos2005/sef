package rag

import (
	"context"
	"fmt"
	"sef/app/entities"
	"sef/pkg/documentservice"

	"github.com/gofiber/fiber/v3/log"
	"gorm.io/gorm"
)

// RAGService handles retrieval augmented generation
type RAGService struct {
	DB              *gorm.DB
	DocumentService *documentservice.DocumentService
}

// NewRAGService creates a new RAG service
func NewRAGService(db *gorm.DB, docService *documentservice.DocumentService) *RAGService {
	return &RAGService{
		DB:              db,
		DocumentService: docService,
	}
}

// DocumentInfo represents document metadata used in RAG
type DocumentInfo struct {
	Title string
	Score float32
}

// AugmentPromptResult contains the augmented prompt and document info
type AugmentPromptResult struct {
	AugmentedPrompt string
	DocumentsUsed   []DocumentInfo
}

// AugmentPrompt retrieves relevant context and augments the user's prompt
func (rs *RAGService) AugmentPrompt(ctx context.Context, userPrompt string, chatbotID uint, limit int) (*AugmentPromptResult, error) {
	if limit == 0 {
		limit = 7 // Default to 7 most relevant chunks
	}

	// Get chatbot with documents
	var chatbot entities.Chatbot
	if err := rs.DB.Preload("Documents").First(&chatbot, chatbotID).Error; err != nil {
		return &AugmentPromptResult{AugmentedPrompt: userPrompt}, nil
	}

	// If no documents assigned, return original prompt
	if len(chatbot.Documents) == 0 {
		return &AugmentPromptResult{AugmentedPrompt: userPrompt}, nil
	}

	// Get document IDs
	documentIDs := make([]uint, 0, len(chatbot.Documents))
	for _, doc := range chatbot.Documents {
		if doc.Status == "ready" {
			documentIDs = append(documentIDs, doc.ID)
		}
	}

	if len(documentIDs) == 0 {
		return &AugmentPromptResult{AugmentedPrompt: userPrompt}, nil
	}

	// Get relevant context
	results, err := rs.DocumentService.GetRelevantContext(ctx, userPrompt, documentIDs, limit)
	if err != nil {
		return &AugmentPromptResult{AugmentedPrompt: userPrompt}, err
	}

	for _, r := range results {
		log.Info("RAG chunk score: ", r.Score, " title: ", r.Payload["title"])
	}

	// If no relevant context found, return original prompt
	if len(results) == 0 {
		return &AugmentPromptResult{AugmentedPrompt: userPrompt}, nil
	}

	// Build document indicators and context
	// First pass: identify which documents have at least one chunk above the threshold
	const minRelevanceScore = 0.65
	qualifyingTitles := make(map[string]float32) // map of title to highest score

	for _, result := range results {
		title := ""
		if t, ok := result.Payload["title"].(string); ok {
			title = t
		}

		// Track if this document has a chunk that surpasses the threshold
		if result.Score >= minRelevanceScore {
			if existingScore, exists := qualifyingTitles[title]; !exists || result.Score > existingScore {
				qualifyingTitles[title] = result.Score
			}
		}
	}

	// Second pass: include all chunks from qualifying documents
	var documentsUsed []DocumentInfo
	var contextParts []string
	seenTitles := make(map[string]bool)

	for _, result := range results {
		title := ""
		if t, ok := result.Payload["title"].(string); ok {
			title = t
		}

		text := ""
		if txt, ok := result.Payload["text"].(string); ok {
			text = txt
		}

		// Only include chunks from documents that have at least one chunk above threshold
		if _, isQualifying := qualifyingTitles[title]; !isQualifying {
			continue
		}

		// Track unique documents used (use the highest score for the document)
		if !seenTitles[title] {
			documentsUsed = append(documentsUsed, DocumentInfo{
				Title: title,
				Score: qualifyingTitles[title],
			})
			seenTitles[title] = true
		}

		contextParts = append(contextParts, text)
	}

	// If no chunks passed the relevance threshold, return original prompt
	if len(contextParts) == 0 {
		return &AugmentPromptResult{AugmentedPrompt: userPrompt}, nil
	}

	// Build context from chunks
	contextStr := joinStrings(contextParts, "\n\n---\n\n")

	// Augment the prompt with retrieved context
	augmentedPrompt := fmt.Sprintf(`You are provided with relevant documentation to help answer the user's question accurately.

=== RELEVANT DOCUMENTATION ===
%s
=== END OF DOCUMENTATION ===

User Question: %s

Please provide a comprehensive and accurate answer based on the documentation provided above. If documentation has missing parts and you are unsure, please indicate that in your response.`,
		contextStr,
		userPrompt)

	return &AugmentPromptResult{
		AugmentedPrompt: augmentedPrompt,
		DocumentsUsed:   documentsUsed,
	}, nil
}

// GetDocumentStats returns statistics about chatbot's documents
func (rs *RAGService) GetDocumentStats(chatbotID uint) (map[string]interface{}, error) {
	var chatbot entities.Chatbot
	if err := rs.DB.Preload("Documents").First(&chatbot, chatbotID).Error; err != nil {
		return nil, err
	}

	readyCount := 0
	totalChunks := 0
	for _, doc := range chatbot.Documents {
		if doc.Status == "ready" {
			readyCount++
			totalChunks += doc.ChunkCount
		}
	}

	stats := map[string]interface{}{
		"document_count":  readyCount,
		"total_chunks":    totalChunks,
		"total_documents": len(chatbot.Documents),
	}

	return stats, nil
}

// IsRAGAvailable checks if RAG is available for the chatbot
func (rs *RAGService) IsRAGAvailable(chatbotID uint) (bool, error) {
	var chatbot entities.Chatbot
	if err := rs.DB.Preload("Documents").First(&chatbot, chatbotID).Error; err != nil {
		return false, err
	}

	for _, doc := range chatbot.Documents {
		if doc.Status == "ready" {
			return true, nil
		}
	}

	return false, nil
}

// Helper function to join strings
func joinStrings(strs []string, sep string) string {
	if len(strs) == 0 {
		return ""
	}
	result := strs[0]
	for i := 1; i < len(strs); i++ {
		result += sep + strs[i]
	}
	return result
}
