package chunking

import (
	"strings"
	"unicode"
)

// SemanticChunkingStrategy provides more intelligent chunking
type SemanticChunkingStrategy struct {
	ChunkSize       int
	ChunkOverlap    int
	PreserveHeaders bool // Try to keep section headers with content
	MinChunkSize    int  // Minimum viable chunk size
}

// SmartStrategy returns an optimized strategy for semantic search
func SmartStrategy() SemanticChunkingStrategy {
	return SemanticChunkingStrategy{
		ChunkSize:       512,
		ChunkOverlap:    128,
		PreserveHeaders: true,
		MinChunkSize:    100,
	}
}

// ChunkWithHeaders splits text while preserving headers and structure
func ChunkWithHeaders(text string, strategy SemanticChunkingStrategy) []Chunk {
	if text == "" {
		return []Chunk{}
	}

	// First, identify potential headers (lines that are short and followed by content)
	lines := strings.Split(text, "\n")
	var sections []textSection
	currentSection := textSection{header: "", content: strings.Builder{}}

	for i, line := range lines {
		line = strings.TrimSpace(line)

		// Check if this might be a header
		isHeader := false
		if len(line) > 0 && len(line) < 100 {
			// Check if next lines have content (not a standalone short line)
			if i < len(lines)-1 {
				nextLine := strings.TrimSpace(lines[i+1])
				if len(nextLine) > 0 {
					// Patterns that suggest a header
					if strings.HasSuffix(line, ":") ||
						(len(line) < 50 && !strings.Contains(line, ".")) ||
						isAllCaps(line) {
						isHeader = true
					}
				}
			}
		}

		if isHeader && currentSection.content.Len() > 0 {
			// Start a new section
			sections = append(sections, currentSection)
			currentSection = textSection{header: line, content: strings.Builder{}}
		} else {
			if line != "" {
				if currentSection.content.Len() > 0 {
					currentSection.content.WriteString("\n")
				}
				currentSection.content.WriteString(line)
			}
		}
	}

	// Add the last section
	if currentSection.content.Len() > 0 {
		sections = append(sections, currentSection)
	}

	// Now chunk each section
	var chunks []Chunk
	index := 0

	for _, section := range sections {
		sectionText := section.content.String()
		if section.header != "" {
			sectionText = section.header + "\n" + sectionText
		}

		// If section is small enough, keep it as one chunk
		if len(sectionText) <= strategy.ChunkSize {
			if len(sectionText) >= strategy.MinChunkSize {
				chunks = append(chunks, Chunk{
					Text:  sectionText,
					Index: index,
					Metadata: map[string]interface{}{
						"has_header": section.header != "",
						"header":     section.header,
					},
				})
				index++
			}
		} else {
			// Chunk the section
			baseStrategy := ChunkingStrategy{
				ChunkSize:       strategy.ChunkSize,
				ChunkOverlap:    strategy.ChunkOverlap,
				SplitOnSentence: true,
			}
			sectionChunks := ChunkText(sectionText, baseStrategy)

			for _, chunk := range sectionChunks {
				if len(chunk.Text) >= strategy.MinChunkSize {
					chunk.Index = index
					if chunk.Metadata == nil {
						chunk.Metadata = make(map[string]interface{})
					}
					chunk.Metadata["has_header"] = section.header != ""
					chunk.Metadata["header"] = section.header
					chunks = append(chunks, chunk)
					index++
				}
			}
		}
	}

	return chunks
}

type textSection struct {
	header  string
	content strings.Builder
}

// isAllCaps checks if a string is mostly uppercase (potential header)
func isAllCaps(s string) bool {
	if len(s) < 3 {
		return false
	}

	upperCount := 0
	letterCount := 0

	for _, r := range s {
		if unicode.IsLetter(r) {
			letterCount++
			if unicode.IsUpper(r) {
				upperCount++
			}
		}
	}

	if letterCount == 0 {
		return false
	}

	return float64(upperCount)/float64(letterCount) > 0.8
}

// ExpandWithContext adds surrounding context to a chunk for better understanding
func ExpandWithContext(chunk Chunk, fullText string, contextSize int) Chunk {
	// Add contextSize characters before and after the chunk
	start := chunk.Start - contextSize
	if start < 0 {
		start = 0
	}

	end := chunk.End + contextSize
	if end > len(fullText) {
		end = len(fullText)
	}

	expandedText := fullText[start:end]

	// Mark the added context
	if chunk.Metadata == nil {
		chunk.Metadata = make(map[string]interface{})
	}
	chunk.Metadata["has_expanded_context"] = true
	chunk.Metadata["original_start"] = chunk.Start
	chunk.Metadata["original_end"] = chunk.End

	chunk.Text = expandedText
	chunk.Start = start
	chunk.End = end

	return chunk
}
