package rag

import (
	"context"
	"fmt"
	"math"
	"sef/app/entities"
	"sef/pkg/qdrant"
	"strings"

	"github.com/gofiber/fiber/v3/log"
)

// HybridSearchResult combines vector similarity with keyword matching
type HybridSearchResult struct {
	Result          qdrant.SearchResult
	SemanticScore   float32
	KeywordScore    float32
	CombinedScore   float32
	MatchedKeywords []string
}

// HybridSearch performs both semantic and keyword-based search
func HybridSearch(results []qdrant.SearchResult, query string, semanticWeight float32, keywordWeight float32) []HybridSearchResult {
	if semanticWeight+keywordWeight == 0 {
		semanticWeight = 0.7
		keywordWeight = 0.3
	}

	// Extract keywords from query
	keywords := extractKeywords(query)

	hybridResults := make([]HybridSearchResult, 0, len(results))

	for _, result := range results {
		text := ""
		if t, ok := result.Payload["text"].(string); ok {
			text = t
		}

		// Calculate keyword score
		keywordScore, matched := calculateKeywordScore(text, keywords)

		// Combine scores
		combined := (result.Score * semanticWeight) + (keywordScore * keywordWeight)

		hybridResults = append(hybridResults, HybridSearchResult{
			Result:          result,
			SemanticScore:   result.Score,
			KeywordScore:    keywordScore,
			CombinedScore:   combined,
			MatchedKeywords: matched,
		})
	}

	// Sort by combined score
	for i := 0; i < len(hybridResults); i++ {
		for j := i + 1; j < len(hybridResults); j++ {
			if hybridResults[j].CombinedScore > hybridResults[i].CombinedScore {
				hybridResults[i], hybridResults[j] = hybridResults[j], hybridResults[i]
			}
		}
	}

	return hybridResults
}

// extractKeywords extracts meaningful keywords from query
func extractKeywords(query string) []string {
	// Simple keyword extraction - can be improved with NLP
	query = strings.ToLower(query)
	words := strings.Fields(query)

	// Filter out common stop words
	stopWords := map[string]bool{
		"the": true, "a": true, "an": true, "and": true, "or": true,
		"but": true, "in": true, "on": true, "at": true, "to": true,
		"for": true, "of": true, "with": true, "by": true, "from": true,
		"is": true, "are": true, "was": true, "were": true, "be": true,
		"been": true, "being": true, "have": true, "has": true, "had": true,
		"do": true, "does": true, "did": true, "will": true, "would": true,
		"could": true, "should": true, "may": true, "might": true, "must": true,
		"can": true, "this": true, "that": true, "these": true, "those": true,
		"i": true, "you": true, "he": true, "she": true, "it": true,
		"we": true, "they": true, "what": true, "which": true, "who": true,
		"when": true, "where": true, "why": true, "how": true,
	}

	keywords := make([]string, 0)
	for _, word := range words {
		word = strings.TrimSpace(word)
		// Keep words that are at least 3 chars and not stop words
		if len(word) >= 3 && !stopWords[word] {
			keywords = append(keywords, word)
		}
	}

	return keywords
}

// calculateKeywordScore calculates how many keywords appear in text
func calculateKeywordScore(text string, keywords []string) (float32, []string) {
	if len(keywords) == 0 {
		return 0, []string{}
	}

	text = strings.ToLower(text)
	matched := make([]string, 0)
	matchCount := 0

	for _, keyword := range keywords {
		if strings.Contains(text, keyword) {
			matchCount++
			matched = append(matched, keyword)
		}
	}

	// Score is percentage of keywords found, with bonus for exact phrase
	score := float32(matchCount) / float32(len(keywords))

	// Bonus if all keywords appear in order (phrase match)
	if matchCount == len(keywords) {
		phrase := strings.Join(keywords, " ")
		if strings.Contains(text, phrase) {
			score = float32(math.Min(1.0, float64(score*1.5))) // 50% bonus capped at 1.0
		}
	}

	return score, matched
}

// RerankResults applies cross-encoder style re-ranking (simplified version)
func RerankResults(results []qdrant.SearchResult, query string, topK int) []qdrant.SearchResult {
	// Calculate additional relevance signals
	type scoredResult struct {
		result     qdrant.SearchResult
		finalScore float32
	}

	scored := make([]scoredResult, 0, len(results))

	for i, result := range results {
		text := ""
		if t, ok := result.Payload["text"].(string); ok {
			text = t
		}

		// Positional bias: slightly prefer earlier results from vector search
		positionalScore := float32(1.0) - (float32(i) / float32(len(results)) * 0.1)

		// Length penalty: prefer chunks that are not too short
		lengthScore := float32(1.0)
		if len(text) < 100 {
			lengthScore = 0.8
		}

		// Calculate final score
		finalScore := result.Score * positionalScore * lengthScore

		scored = append(scored, scoredResult{
			result:     result,
			finalScore: finalScore,
		})
	}

	// Sort by final score
	for i := 0; i < len(scored); i++ {
		for j := i + 1; j < len(scored); j++ {
			if scored[j].finalScore > scored[i].finalScore {
				scored[i], scored[j] = scored[j], scored[i]
			}
		}
	}

	// Return top K
	if topK > len(scored) {
		topK = len(scored)
	}

	reranked := make([]qdrant.SearchResult, topK)
	for i := 0; i < topK; i++ {
		reranked[i] = scored[i].result
		reranked[i].Score = scored[i].finalScore // Update with re-ranked score
	}

	return reranked
}

// AugmentPromptWithHybridSearch is an enhanced version using hybrid search
func (rs *RAGService) AugmentPromptWithHybridSearch(ctx context.Context, userPrompt string, chatbotID uint, limit int) (*AugmentPromptResult, error) {
	// Calculate dynamic chunk limit based on query complexity
	dynamicLimit := rs.calculateDynamicChunkLimit(userPrompt, limit)

	if limit == 0 {
		limit = dynamicLimit
	}

	log.Infof("Hybrid search: requesting %d chunks (dynamic limit: %d)", limit, dynamicLimit)

	// Get chatbot with documents
	var chatbot entities.Chatbot
	if err := rs.DB.Preload("Documents").First(&chatbot, chatbotID).Error; err != nil {
		return &AugmentPromptResult{AugmentedPrompt: userPrompt}, nil
	}

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

	if len(results) == 0 {
		return &AugmentPromptResult{AugmentedPrompt: userPrompt}, nil
	}

	// Apply hybrid search (70% semantic, 30% keyword)
	hybridResults := HybridSearch(results, userPrompt, 0.7, 0.3)

	// Re-rank top results
	topResults := make([]qdrant.SearchResult, 0, len(hybridResults))
	for _, hr := range hybridResults {
		hr.Result.Score = hr.CombinedScore // Use combined score
		topResults = append(topResults, hr.Result)
	}

	// Calculate dynamic max chunks for final selection
	var maxScore, sumScore float32
	for _, r := range topResults {
		if r.Score > maxScore {
			maxScore = r.Score
		}
		sumScore += r.Score
	}
	meanScore := sumScore / float32(len(topResults))

	// Determine number of qualifying documents
	seenDocs := make(map[string]bool)
	for _, r := range topResults {
		if title, ok := r.Payload["title"].(string); ok {
			seenDocs[title] = true
		}
	}

	dynamicMaxChunks := rs.calculateMaxChunks(userPrompt, maxScore, meanScore, len(seenDocs))
	log.Infof("Hybrid search: using dynamic max chunks: %d", dynamicMaxChunks)

	// Further re-rank considering position and length
	reranked := RerankResults(topResults, userPrompt, dynamicMaxChunks)

	// Use the standard logic but with re-ranked results
	return rs.buildAugmentedPrompt(userPrompt, reranked)
}

// buildAugmentedPrompt is a helper to build the final prompt
func (rs *RAGService) buildAugmentedPrompt(userPrompt string, results []qdrant.SearchResult) (*AugmentPromptResult, error) {
	if len(results) == 0 {
		return &AugmentPromptResult{AugmentedPrompt: userPrompt}, nil
	}

	// Calculate adaptive threshold
	var maxScore float32 = 0
	for _, result := range results {
		if result.Score > maxScore {
			maxScore = result.Score
		}
	}

	adaptiveThreshold := maxScore * 0.85
	if adaptiveThreshold < 0.55 {
		adaptiveThreshold = 0.55
	}

	// Collect qualifying chunks
	var documentsUsed []DocumentInfo
	var contextParts []string
	seenTitles := make(map[string]bool)

	for _, result := range results {
		if result.Score < adaptiveThreshold {
			continue
		}

		title := ""
		if t, ok := result.Payload["title"].(string); ok {
			title = t
		}

		text := ""
		if txt, ok := result.Payload["text"].(string); ok {
			text = txt
		}

		if !seenTitles[title] {
			documentsUsed = append(documentsUsed, DocumentInfo{
				Title: title,
				Score: result.Score,
			})
			seenTitles[title] = true
		}

		contextParts = append(contextParts, text)
	}

	if len(contextParts) == 0 {
		return &AugmentPromptResult{AugmentedPrompt: userPrompt}, nil
	}

	contextStr := joinStrings(contextParts, "\n\n---\n\n")

	augmentedPrompt := fmt.Sprintf(`You are provided with relevant documentation to help answer the user's question accurately.

=== RELEVANT DOCUMENTATION ===
%s
=== END OF DOCUMENTATION ===

User Question: %s

Please provide a comprehensive and accurate answer based on the documentation provided above. If the documentation doesn't contain enough information to fully answer the question, please indicate that in your response.`,
		contextStr,
		userPrompt)

	return &AugmentPromptResult{
		AugmentedPrompt: augmentedPrompt,
		DocumentsUsed:   documentsUsed,
	}, nil
}
