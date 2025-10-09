package rag

import (
	"context"
	"fmt"
	"sef/app/entities"
	"sef/pkg/documentservice"
	"strings"

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
	// Check if query is just a greeting/small talk - skip RAG if so
	if rs.isSmallTalk(userPrompt) {
		log.Info("Query detected as small talk/greeting - skipping RAG")
		return &AugmentPromptResult{AugmentedPrompt: userPrompt}, nil
	}

	// Calculate dynamic chunk limit based on query complexity
	dynamicLimit := rs.calculateDynamicChunkLimit(userPrompt, limit)

	if limit == 0 {
		limit = dynamicLimit // Use calculated dynamic limit
	}

	log.Infof("Query complexity analysis: requesting %d chunks (dynamic limit: %d)", limit, dynamicLimit)

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

	// Adaptive threshold based on score distribution
	// Calculate mean and standard deviation of scores
	var scoreSum float32 = 0
	var maxScore float32 = 0
	for _, result := range results {
		scoreSum += result.Score
		if result.Score > maxScore {
			maxScore = result.Score
		}
	}
	meanScore := scoreSum / float32(len(results))

	// CRITICAL: If even the top score is too low, this query is likely irrelevant
	// Reject all results if max score is below strict threshold
	const strictMinThreshold float32 = 0.75 // Require at least 0.75 for top result
	if maxScore < strictMinThreshold {
		log.Infof("Max score %.2f below strict threshold %.2f - no relevant documents found", maxScore, strictMinThreshold)
		return &AugmentPromptResult{AugmentedPrompt: userPrompt}, nil
	}

	// Use adaptive threshold: use chunks that are either:
	// 1. Above 0.70 (minimum threshold for relevance - increased from 0.55)
	// 2. Within 90% of the top score (relative threshold - increased from 85%)
	const absoluteMinThreshold float32 = 0.70 // Increased from 0.55 to be more strict
	relativeThreshold := maxScore * 0.90      // Increased from 0.85

	// Use the higher of the two thresholds for better quality
	adaptiveThreshold := absoluteMinThreshold
	if relativeThreshold > adaptiveThreshold {
		adaptiveThreshold = relativeThreshold
	}

	log.Infof("RAG adaptive threshold: %.2f (max: %.2f, mean: %.2f)", adaptiveThreshold, maxScore, meanScore)

	// Build document indicators and context
	// First pass: identify which documents have qualifying chunks
	qualifyingTitles := make(map[string]float32) // map of title to highest score

	for _, result := range results {
		title := ""
		if t, ok := result.Payload["title"].(string); ok {
			title = t
		}

		// Track if this document has a chunk that surpasses the threshold
		if result.Score >= adaptiveThreshold {
			if existingScore, exists := qualifyingTitles[title]; !exists || result.Score > existingScore {
				qualifyingTitles[title] = result.Score
			}
		}
	}

	// Second pass: include chunks from qualifying documents
	// Calculate dynamic max chunks based on query and score distribution
	maxChunksToInclude := rs.calculateMaxChunks(userPrompt, maxScore, meanScore, len(qualifyingTitles))
	log.Infof("Using dynamic max chunks: %d (based on query complexity and score quality)", maxChunksToInclude)

	var documentsUsed []DocumentInfo
	var contextParts []string
	seenTitles := make(map[string]bool)
	chunksIncluded := 0

	for _, result := range results {
		if chunksIncluded >= maxChunksToInclude {
			break
		}

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
		chunksIncluded++
	}

	// If no chunks passed the relevance threshold, return original prompt
	if len(contextParts) == 0 {
		log.Infof("No chunks passed relevance threshold of %.2f", adaptiveThreshold)
		return &AugmentPromptResult{AugmentedPrompt: userPrompt}, nil
	}

	log.Infof("Using %d chunks from %d documents", len(contextParts), len(documentsUsed))

	// Build context from chunks
	contextStr := joinStrings(contextParts, "\n\n---\n\n")

	// Augment the prompt with retrieved context
	augmentedPrompt := fmt.Sprintf(`You are provided with relevant documentation to help answer the user's question accurately.

=== RELEVANT DOCUMENTATION ===
%s
=== END OF DOCUMENTATION ===

User Question: %s

Please provide a comprehensive and accurate answer based on the documentation provided above. If the documentation doesn't contain enough information to fully answer the question, fill the blank with your own knowledge. If you do not know the answer, please say "I don't know." Do not make up an answer.`,
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

// calculateDynamicChunkLimit determines optimal number of chunks to retrieve based on query complexity
func (rs *RAGService) calculateDynamicChunkLimit(query string, explicitLimit int) int {
	// If explicit limit provided, use it
	if explicitLimit > 0 {
		return explicitLimit
	}

	// Analyze query complexity
	words := len(strings.Fields(query))
	questions := strings.Count(strings.ToLower(query), "?")

	// Check for complexity indicators
	isComplex := false
	complexKeywords := []string{
		"explain", "describe", "compare", "difference", "why", "how",
		"what are", "tell me about", "elaborate", "detail", "comprehensive",
		"multiple", "all", "various", "different", "several",
	}

	queryLower := strings.ToLower(query)
	for _, keyword := range complexKeywords {
		if strings.Contains(queryLower, keyword) {
			isComplex = true
			break
		}
	}

	// Check for multi-part questions
	hasMultipleParts := strings.Contains(query, " and ") ||
		strings.Contains(query, " or ") ||
		questions > 1

	// Calculate base limit
	baseLimit := 8 // Default base

	// Adjust based on query length
	if words > 20 {
		baseLimit += 3 // Long, detailed questions need more context
	} else if words > 10 {
		baseLimit += 1
	} else if words < 5 {
		baseLimit -= 2 // Simple questions need less context
	}

	// Adjust based on complexity
	if isComplex {
		baseLimit += 2
	}

	if hasMultipleParts {
		baseLimit += 2 // Multi-part questions need more context
	}

	// Ensure reasonable bounds
	if baseLimit < 5 {
		baseLimit = 5 // Minimum
	}
	if baseLimit > 15 {
		baseLimit = 15 // Maximum to avoid token overflow
	}

	log.Infof("Query analysis: %d words, complex=%v, multi-part=%v → limit=%d",
		words, isComplex, hasMultipleParts, baseLimit)

	return baseLimit
}

// calculateMaxChunks determines how many chunks to include in final context
func (rs *RAGService) calculateMaxChunks(query string, maxScore, meanScore float32, documentCount int) int {
	// Base calculation on score quality
	scoreQuality := maxScore - meanScore

	// High score quality (big gap) = can be more selective
	// Low score quality (small gap) = need more chunks to ensure coverage

	baseMax := 7 // Default

	// Adjust based on score spread
	if scoreQuality > 0.2 {
		// Large spread - top results are clearly better, can use fewer
		baseMax = 5
	} else if scoreQuality > 0.15 {
		// Good spread
		baseMax = 6
	} else if scoreQuality < 0.08 {
		// Very similar scores - might need more to cover all relevant content
		baseMax = 9
	}

	// Adjust based on number of qualifying documents
	if documentCount == 1 {
		// Single document - can include more chunks from it
		baseMax += 2
	} else if documentCount > 3 {
		// Many documents - be more selective per document
		baseMax = max(baseMax-1, 5)
	}

	// Adjust based on query complexity
	words := len(strings.Fields(query))
	if words > 20 {
		// Complex query - might need more context
		baseMax += 2
	} else if words < 5 {
		// Simple query - fewer chunks sufficient
		baseMax = max(baseMax-2, 4)
	}

	// Ensure reasonable bounds
	if baseMax < 4 {
		baseMax = 4 // Minimum - at least get some context
	}
	if baseMax > 12 {
		baseMax = 12 // Maximum - avoid context overflow
	}

	return baseMax
}

// Helper function for max
func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// isSmallTalk detects if a query is just a greeting or small talk that doesn't need RAG
func (rs *RAGService) isSmallTalk(query string) bool {
	queryLower := strings.ToLower(strings.TrimSpace(query))

	// Remove punctuation for comparison
	queryLower = strings.ReplaceAll(queryLower, "?", "")
	queryLower = strings.ReplaceAll(queryLower, "!", "")
	queryLower = strings.ReplaceAll(queryLower, ".", "")

	// Common greetings and small talk patterns (English and Turkish)
	smallTalkPatterns := []string{
		// English greetings
		"hello", "hi", "hey", "good morning", "good afternoon", "good evening",
		"how are you", "how do you do", "whats up", "how's it going",
		"nice to meet you", "pleased to meet you",

		// Turkish greetings
		"merhaba", "selam", "selamünaleyküm", "günaydın", "iyi günler",
		"iyi akşamlar", "iyi geceler", "nasılsın", "nasılsınız",
		"nasilsin", "nasilsiniz", "naber", "ne haber",
		"hoş geldin", "hoşgeldin", "hoş geldiniz", "hoşgeldiniz",
		"tanıştığımıza memnun oldum", "memnun oldum",

		// Simple yes/no/thanks
		"thanks", "thank you", "teşekkür", "teşekkürler", "sağol", "sagol",
		"yes", "no", "ok", "okay", "evet", "hayır", "hayir", "tamam",

		// Status checks
		"are you there", "are you here", "can you hear me",
		"orada mısın", "orada misin", "buradasın", "buradasınız",
	}

	// Check if query matches any small talk pattern
	for _, pattern := range smallTalkPatterns {
		if strings.Contains(queryLower, pattern) {
			return true
		}
	}

	// Check for very short queries (likely greetings)
	words := strings.Fields(queryLower)
	if len(words) <= 3 {
		// Additional check: if it's short and doesn't contain question words or technical terms
		hasQuestionWord := false
		questionWords := []string{"what", "when", "where", "who", "why", "how", "which",
			"ne", "nerede", "kim", "neden", "nasıl", "hangi", "ne zaman"}

		for _, word := range words {
			for _, qw := range questionWords {
				if strings.Contains(word, qw) {
					hasQuestionWord = true
					break
				}
			}
			if hasQuestionWord {
				break
			}
		}

		// If it's short, has greeting-like words, and no question words, it's likely small talk
		if !hasQuestionWord {
			commonWords := []string{"iyi", "kötü", "fena", "güzel", "hoş", "hos",
				"good", "bad", "fine", "well", "nice"}
			for _, word := range words {
				for _, cw := range commonWords {
					if word == cw {
						return true
					}
				}
			}
		}
	}

	return false
}
