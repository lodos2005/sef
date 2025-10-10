package rag

import (
	"context"
	"fmt"
	"sef/app/entities"
)

// DocumentQualityMetrics provides insights into document quality for RAG
type DocumentQualityMetrics struct {
	DocumentID     uint
	DocumentTitle  string
	TotalChunks    int
	AvgChunkLength int
	MinScore       float32
	MaxScore       float32
	AvgScore       float32
	ScoreStdDev    float32
	QualityRating  string // "Excellent", "Good", "Fair", "Poor"
}

// AnalyzeDocumentQuality analyzes a document's effectiveness for RAG
func (rs *RAGService) AnalyzeDocumentQuality(ctx context.Context, documentID uint, sampleQueries []string) (*DocumentQualityMetrics, error) {
	var document entities.Document
	if err := rs.DB.First(&document, documentID).Error; err != nil {
		return nil, fmt.Errorf("document not found: %w", err)
	}

	if document.Status != "ready" {
		return nil, fmt.Errorf("document not ready for analysis: status=%s", document.Status)
	}

	metrics := &DocumentQualityMetrics{
		DocumentID:    documentID,
		DocumentTitle: document.Title,
		TotalChunks:   document.ChunkCount,
	}

	// If no sample queries provided, use generic ones
	if len(sampleQueries) == 0 {
		sampleQueries = []string{
			document.Title,       // Document title itself
			"what is this about", // Generic question
			document.Content[:min(100, len(document.Content))], // First 100 chars
		}
	}

	// Test with sample queries
	var allScores []float32
	var totalChunkLength int

	for _, query := range sampleQueries {
		results, err := rs.DocumentService.GetRelevantContext(ctx, query, []uint{documentID}, 10)
		if err != nil {
			continue
		}

		for _, result := range results {
			allScores = append(allScores, result.Score)

			if text, ok := result.Payload["text"].(string); ok {
				totalChunkLength += len(text)
			}
		}
	}

	if len(allScores) == 0 {
		return nil, fmt.Errorf("no scores collected for analysis")
	}

	// Calculate statistics
	var sum, minScore, maxScore float32
	minScore = 1.0
	maxScore = 0.0

	for _, score := range allScores {
		sum += score
		if score < minScore {
			minScore = score
		}
		if score > maxScore {
			maxScore = score
		}
	}

	avgScore := sum / float32(len(allScores))

	// Calculate standard deviation
	var varianceSum float32
	for _, score := range allScores {
		diff := score - avgScore
		varianceSum += diff * diff
	}
	stdDev := float32(0)
	if len(allScores) > 1 {
		stdDev = float32(varianceSum) / float32(len(allScores)-1)
		stdDev = float32(sqrt(float64(stdDev)))
	}

	metrics.AvgChunkLength = totalChunkLength / len(allScores)
	metrics.MinScore = minScore
	metrics.MaxScore = maxScore
	metrics.AvgScore = avgScore
	metrics.ScoreStdDev = stdDev

	// Determine quality rating
	// Good documents have:
	// - High average scores (>0.7)
	// - Low standard deviation (<0.15) - consistent quality
	// - Reasonable chunk sizes (300-700 chars)

	qualityPoints := 0

	if avgScore > 0.72 {
		qualityPoints += 3
	} else if avgScore > 0.65 {
		qualityPoints += 2
	} else if avgScore > 0.55 {
		qualityPoints += 1
	}

	if stdDev < 0.10 {
		qualityPoints += 2
	} else if stdDev < 0.15 {
		qualityPoints += 1
	}

	if metrics.AvgChunkLength >= 300 && metrics.AvgChunkLength <= 700 {
		qualityPoints += 2
	} else if metrics.AvgChunkLength >= 200 && metrics.AvgChunkLength <= 900 {
		qualityPoints += 1
	}

	// Rate based on points
	switch {
	case qualityPoints >= 6:
		metrics.QualityRating = "Excellent"
	case qualityPoints >= 4:
		metrics.QualityRating = "Good"
	case qualityPoints >= 2:
		metrics.QualityRating = "Fair"
	default:
		metrics.QualityRating = "Poor"
	}

	return metrics, nil
}

// CompareBeforeAfter compares document quality before and after re-processing
type ComparisonResult struct {
	Before   *DocumentQualityMetrics
	After    *DocumentQualityMetrics
	Improved bool
	Changes  []string
}

// Helper functions
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func sqrt(x float64) float64 {
	if x < 0 {
		return 0
	}

	// Newton's method for square root
	z := x
	for i := 0; i < 10; i++ {
		z = z - (z*z-x)/(2*z)
	}
	return z
}

// GetRAGHealth provides overall health metrics for the RAG system
type RAGHealthMetrics struct {
	TotalDocuments      int
	ReadyDocuments      int
	ProcessingDocuments int
	FailedDocuments     int
	TotalChunks         int
	AvgChunksPerDoc     float64
	DocumentsAnalyzed   int
	AvgQualityScore     float32
	RecommendedActions  []string
}

// GetSystemHealth analyzes overall RAG system health
func (rs *RAGService) GetSystemHealth(ctx context.Context, chatbotID uint) (*RAGHealthMetrics, error) {
	var chatbot entities.Chatbot
	if err := rs.DB.Preload("Documents").First(&chatbot, chatbotID).Error; err != nil {
		return nil, err
	}

	metrics := &RAGHealthMetrics{}
	metrics.TotalDocuments = len(chatbot.Documents)

	var totalChunks int
	for _, doc := range chatbot.Documents {
		switch doc.Status {
		case "ready":
			metrics.ReadyDocuments++
			totalChunks += doc.ChunkCount
		case "processing":
			metrics.ProcessingDocuments++
		case "failed":
			metrics.FailedDocuments++
		}
	}

	metrics.TotalChunks = totalChunks
	if metrics.ReadyDocuments > 0 {
		metrics.AvgChunksPerDoc = float64(totalChunks) / float64(metrics.ReadyDocuments)
	}

	// Recommendations
	if metrics.FailedDocuments > 0 {
		metrics.RecommendedActions = append(metrics.RecommendedActions,
			fmt.Sprintf("Re-process %d failed documents", metrics.FailedDocuments))
	}

	if metrics.AvgChunksPerDoc > 50 {
		metrics.RecommendedActions = append(metrics.RecommendedActions,
			"Documents have many chunks - consider reducing chunk size or splitting documents")
	}

	if metrics.AvgChunksPerDoc < 5 {
		metrics.RecommendedActions = append(metrics.RecommendedActions,
			"Documents have few chunks - consider larger chunk size or merging documents")
	}

	if metrics.TotalChunks > 10000 {
		metrics.RecommendedActions = append(metrics.RecommendedActions,
			"Large number of chunks may slow searches - consider pruning less important documents")
	}

	if len(metrics.RecommendedActions) == 0 {
		metrics.RecommendedActions = append(metrics.RecommendedActions, "System health looks good!")
	}

	return metrics, nil
}
