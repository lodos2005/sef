package chunking

import (
	"strings"
	"unicode"
)

// Chunk represents a text chunk with metadata
type Chunk struct {
	Text     string
	Index    int
	Start    int
	End      int
	Metadata map[string]interface{}
}

// ChunkingStrategy defines how to split text
type ChunkingStrategy struct {
	ChunkSize       int  // Maximum characters per chunk
	ChunkOverlap    int  // Overlap between chunks
	SplitOnSentence bool // Try to split on sentence boundaries
}

// DefaultStrategy returns a sensible default chunking strategy
func DefaultStrategy() ChunkingStrategy {
	return ChunkingStrategy{
		ChunkSize:       1000,
		ChunkOverlap:    200,
		SplitOnSentence: true,
	}
}

// ChunkText splits text into chunks based on the strategy
func ChunkText(text string, strategy ChunkingStrategy) []Chunk {
	if text == "" {
		return []Chunk{}
	}

	// Normalize whitespace
	text = normalizeWhitespace(text)

	var chunks []Chunk
	textLen := len(text)
	start := 0
	index := 0

	for start < textLen {
		end := start + strategy.ChunkSize
		if end > textLen {
			end = textLen
		}

		// Try to find a good break point
		if strategy.SplitOnSentence && end < textLen {
			breakPoint := findSentenceBreak(text, start, end)
			if breakPoint > start {
				end = breakPoint
			}
		}

		chunkText := strings.TrimSpace(text[start:end])
		if chunkText != "" {
			chunks = append(chunks, Chunk{
				Text:  chunkText,
				Index: index,
				Start: start,
				End:   end,
			})
			index++
		}

		// Move start position with overlap
		newStart := end - strategy.ChunkOverlap

		// Ensure we always move forward to avoid infinite loops
		if newStart <= start {
			newStart = end
		}

		start = newStart
	}

	return chunks
}

// findSentenceBreak finds the last sentence ending before the max position
func findSentenceBreak(text string, start, maxEnd int) int {
	sentenceEnders := []rune{'.', '!', '?', '\n'}

	// Look backwards from maxEnd to find a sentence break
	for i := maxEnd - 1; i > start; i-- {
		char := rune(text[i])
		for _, ender := range sentenceEnders {
			if char == ender {
				// Make sure there's a space or end of text after
				if i+1 >= len(text) || unicode.IsSpace(rune(text[i+1])) {
					return i + 1
				}
			}
		}
	}

	// If no sentence break found, try to break on word boundary
	for i := maxEnd - 1; i > start; i-- {
		if unicode.IsSpace(rune(text[i])) {
			return i
		}
	}

	return maxEnd
}

// normalizeWhitespace replaces multiple whitespace characters with single spaces
func normalizeWhitespace(text string) string {
	var result strings.Builder
	var prevSpace bool

	for _, r := range text {
		if unicode.IsSpace(r) {
			if !prevSpace {
				result.WriteRune(' ')
				prevSpace = true
			}
		} else {
			result.WriteRune(r)
			prevSpace = false
		}
	}

	return strings.TrimSpace(result.String())
}

// ChunkByParagraphs splits text by paragraphs and then chunks if needed
func ChunkByParagraphs(text string, maxChunkSize int) []Chunk {
	paragraphs := strings.Split(text, "\n\n")
	var chunks []Chunk
	index := 0

	for _, para := range paragraphs {
		para = strings.TrimSpace(para)
		if para == "" {
			continue
		}

		// If paragraph is small enough, use it as a chunk
		if len(para) <= maxChunkSize {
			chunks = append(chunks, Chunk{
				Text:  para,
				Index: index,
			})
			index++
		} else {
			// Paragraph too large, chunk it
			strategy := ChunkingStrategy{
				ChunkSize:       maxChunkSize,
				ChunkOverlap:    100,
				SplitOnSentence: true,
			}
			paraChunks := ChunkText(para, strategy)
			for _, chunk := range paraChunks {
				chunk.Index = index
				chunks = append(chunks, chunk)
				index++
			}
		}
	}

	return chunks
}
