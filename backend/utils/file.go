package utils

import (
	"os"
	"path/filepath"
)

// ReadFile reads the content of a file and returns it as a string
func ReadFile(path string) (string, error) {
	// Get absolute path
	absPath, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}

	// Read file content
	content, err := os.ReadFile(absPath)
	if err != nil {
		return "", err
	}

	return string(content), nil
}
