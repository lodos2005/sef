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
// Optimized for better semantic search results
func DefaultStrategy() ChunkingStrategy {
	return ChunkingStrategy{
		ChunkSize:       512, // Smaller chunks for more focused semantic meaning
		ChunkOverlap:    128, // 25% overlap to maintain context across boundaries
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

		// IMPROVEMENT: Avoid breaking inside code blocks
		if isInsideCodeBlock(text, end) {
			// Find the end of the code block
			codeBlockEnd := findCodeBlockEnd(text, end)
			if codeBlockEnd > end && codeBlockEnd < textLen {
				end = codeBlockEnd
			}
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
			// IMPROVEMENT: Enhanced metadata with content type detection
			contentType := detectContentType(chunkText)
			metadata := map[string]interface{}{
				"char_count":   len(chunkText),
				"word_count":   len(strings.Fields(chunkText)),
				"content_type": contentType,
			}

			chunks = append(chunks, Chunk{
				Text:     chunkText,
				Index:    index,
				Start:    start,
				End:      end,
				Metadata: metadata,
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

// IMPROVEMENT: isInsideCodeBlock checks if a position is inside a code block
func isInsideCodeBlock(text string, position int) bool {
	// Count code block fences before this position
	beforeText := text[:position]
	fenceCount := strings.Count(beforeText, "```")
	
	// Odd number means we're inside a code block
	return fenceCount%2 == 1
}

// IMPROVEMENT: findCodeBlockEnd finds the end of a code block starting from position
func findCodeBlockEnd(text string, position int) int {
	// Find the closing ```
	afterText := text[position:]
	closingIndex := strings.Index(afterText, "```")
	
	if closingIndex != -1 {
		// Return position after the closing fence
		return position + closingIndex + 3
	}
	
	// If no closing fence found, return original position
	return position
}

// IMPROVEMENT: detectContentType analyzes text to determine content type
// This helps RAG understand what kind of information is in each chunk
func detectContentType(text string) string {
	// Check for code blocks
	if strings.Contains(text, "```") {
		return "code"
	}
	
	// Check for command line syntax (especially relevant for your Liman doc!)
	if strings.Contains(text, "sudo ") || strings.Contains(text, "apt ") || 
	   strings.Contains(text, "$ ") || strings.HasPrefix(strings.TrimSpace(text), "#") {
		return "command"
	}
	
	// Check for lists (markdown or numbered)
	lines := strings.Split(text, "\n")
	listCount := 0
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "- ") || 
		   strings.HasPrefix(trimmed, "* ") ||
		   strings.HasPrefix(trimmed, "+ ") ||
		   (len(trimmed) > 2 && trimmed[0] >= '0' && trimmed[0] <= '9' && trimmed[1] == '.') {
			listCount++
		}
	}
	if listCount > 2 {
		return "list"
	}
	
	// Check for headers (Markdown style)
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "#") {
			return "structured"
		}
	}
	
	return "prose"
}