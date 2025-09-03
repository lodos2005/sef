package providers

import (
	"context"
	"fmt"
)

// LLMProvider defines the interface for LLM providers
type LLMProvider interface {
	// Generate generates a response from the LLM with streaming support
	Generate(ctx context.Context, prompt string, options map[string]interface{}) (<-chan string, error)
	// GenerateChat generates a response using chat format with proper message roles
	GenerateChat(ctx context.Context, messages []ChatMessage, options map[string]interface{}) (<-chan string, error)
	// ListModels returns available models for the provider
	ListModels() ([]string, error)
	// ValidateConfig validates the provider configuration
	ValidateConfig(config map[string]interface{}) error
}

// ChatMessage represents a message with role and content
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ProviderFactory creates provider instances
type ProviderFactory struct{}

// NewProvider creates a new provider instance based on type
func (f *ProviderFactory) NewProvider(providerType string, config map[string]interface{}) (LLMProvider, error) {
	switch providerType {
	case "ollama":
		return NewOllamaProvider(config), nil
	default:
		return nil, fmt.Errorf("unsupported provider type: %s", providerType)
	}
}
