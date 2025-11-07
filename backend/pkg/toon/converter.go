package toon

import (
	"encoding/json"
	"fmt"

	"github.com/alpkeskin/gotoon"
)

// Converter handles conversion between JSON and TOON formats
type Converter struct {
	indent       int
	delimiter    string
	lengthMarker bool
}

// NewConverter creates a new TOON converter with default options
func NewConverter() *Converter {
	return &Converter{
		indent:       2,
		delimiter:    ",",
		lengthMarker: false,
	}
}

// WithIndent sets the indentation level for TOON output
func (c *Converter) WithIndent(indent int) *Converter {
	c.indent = indent
	return c
}

// WithDelimiter sets the delimiter for array values
func (c *Converter) WithDelimiter(delimiter string) *Converter {
	c.delimiter = delimiter
	return c
}

// WithLengthMarker enables length markers for arrays
func (c *Converter) WithLengthMarker(enabled bool) *Converter {
	c.lengthMarker = enabled
	return c
}

// ConvertMapToTOON converts a map[string]interface{} to TOON format string
func (c *Converter) ConvertMapToTOON(data map[string]interface{}) (string, error) {
	return c.ConvertToTOON(data)
}

// ConvertToTOON converts any data structure to TOON format string
func (c *Converter) ConvertToTOON(data interface{}) (string, error) {
	// Prepare gotoon options
	options := []gotoon.EncodeOption{
		gotoon.WithIndent(c.indent),
		gotoon.WithDelimiter(c.delimiter),
	}

	if c.lengthMarker {
		options = append(options, gotoon.WithLengthMarker())
	}

	// Convert to TOON
	toonData, err := gotoon.Encode(data, options...)
	if err != nil {
		return "", fmt.Errorf("error encoding to TOON: %w", err)
	}

	return toonData, nil
}

// ConvertJSONToTOON converts a JSON string to TOON format string
func (c *Converter) ConvertJSONToTOON(jsonData string) (string, error) {
	// Parse JSON
	var data interface{}
	if err := json.Unmarshal([]byte(jsonData), &data); err != nil {
		return "", fmt.Errorf("error parsing JSON: %w", err)
	}

	return c.ConvertToTOON(data)
}

// ConvertJSONBytesToTOON converts JSON bytes to TOON format string
func (c *Converter) ConvertJSONBytesToTOON(jsonData []byte) (string, error) {
	// Parse JSON
	var data interface{}
	if err := json.Unmarshal(jsonData, &data); err != nil {
		return "", fmt.Errorf("error parsing JSON: %w", err)
	}

	return c.ConvertToTOON(data)
}
