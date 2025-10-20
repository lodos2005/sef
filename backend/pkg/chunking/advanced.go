package chunking

import (
	"regexp"
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

	// IMPROVEMENT: Better header detection with Markdown awareness
	lines := strings.Split(text, "\n")
	var sections []textSection
	currentSection := textSection{header: "", content: strings.Builder{}}

	for i, line := range lines {
		line = strings.TrimSpace(line)

		// IMPROVEMENT: Detect Markdown headers (ATX style: # Header)
		isMarkdownHeader, headerLevel := isMarkdownHeader(line)
		
		// IMPROVEMENT: Detect Setext headers (underlined)
		isSetextHeader := false
		if !isMarkdownHeader && i < len(lines)-1 {
			nextLine := strings.TrimSpace(lines[i+1])
			if isSetextUnderline(nextLine) {
				isSetextHeader = true
				headerLevel = 1
				if strings.HasPrefix(nextLine, "---") {
					headerLevel = 2
				}
			}
		}

		// Check if this might be a header (legacy detection for non-Markdown)
		isLegacyHeader := false
		if !isMarkdownHeader && !isSetextHeader && len(line) > 0 && len(line) < 100 {
			// Check if next lines have content (not a standalone short line)
			if i < len(lines)-1 {
				nextLine := strings.TrimSpace(lines[i+1])
				if len(nextLine) > 0 && !isSetextUnderline(nextLine) {
					// Patterns that suggest a header
					if strings.HasSuffix(line, ":") ||
						(len(line) < 50 && !strings.Contains(line, ".")) ||
						isAllCaps(line) {
						isLegacyHeader = true
						headerLevel = 3 // Assign lower priority to legacy headers
					}
				}
			}
		}

		isHeader := isMarkdownHeader || isSetextHeader || isLegacyHeader

		if isHeader && currentSection.content.Len() > 0 {
			// Start a new section
			sections = append(sections, currentSection)
			currentSection = textSection{
				header:      line,
				headerLevel: headerLevel,
				content:     strings.Builder{},
			}
		} else if isSetextHeader {
			// This is the underline, skip it
			continue
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
						"has_header":   section.header != "",
						"header":       section.header,
						"header_level": section.headerLevel,
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
					chunk.Metadata["header_level"] = section.headerLevel
					chunks = append(chunks, chunk)
					index++
				}
			}
		}
	}

	return chunks
}

type textSection struct {
	header      string
	headerLevel int
	content     strings.Builder
}

// IMPROVEMENT: isMarkdownHeader detects ATX-style Markdown headers (# Header)
func isMarkdownHeader(line string) (bool, int) {
	trimmed := strings.TrimSpace(line)
	
	// Check for ATX headers (# Header)
	if strings.HasPrefix(trimmed, "#") {
		level := 0
		for _ , c := range trimmed {
			if c == '#' {
				level++
			} else if c == ' ' && level > 0 && level <= 6 {
				// Valid header: 1-6 # symbols followed by space
				return true, level
			} else {
				// Not a valid header (too many # or no space)
				break
			}
		}
	}
	
	return false, 0
}

// IMPROVEMENT: isSetextUnderline checks if a line is a Setext header underline
func isSetextUnderline(line string) bool {
	trimmed := strings.TrimSpace(line)
	if len(trimmed) < 3 {
		return false
	}
	
	// Check for === or --- (at least 3 characters)
	if matched, _ := regexp.MatchString(`^={3,}$`, trimmed); matched {
		return true
	}
	if matched, _ := regexp.MatchString(`^-{3,}$`, trimmed); matched {
		return true
	}
	
	return false
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