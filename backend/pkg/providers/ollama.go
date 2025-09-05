package providers

import (
	"context"
	"fmt"
	"sef/pkg/ollama"
)

// OllamaProvider implements the LLMProvider interface for Ollama
type OllamaProvider struct {
	client *ollama.OllamaClient
}

// NewOllamaProvider creates a new Ollama provider instance
func NewOllamaProvider(config map[string]interface{}) *OllamaProvider {
	baseURL := "http://10.67.10.12:11434"
	if url, ok := config["base_url"].(string); ok {
		baseURL = url
	}

	return &OllamaProvider{
		client: ollama.NewOllamaClient(baseURL),
	}
}

// Generate generates a response from Ollama with streaming support
func (o *OllamaProvider) Generate(ctx context.Context, prompt string, options map[string]interface{}) (<-chan string, error) {
	model := "gpt-oss:20b" // Default model
	if m, ok := options["model"].(string); ok {
		model = m
	}

	// Use streaming generation from Ollama client
	return o.client.GenerateTextStream(ctx, model, prompt, options)
}

// GenerateChat generates a response using Ollama's chat API with proper message roles
func (o *OllamaProvider) GenerateChat(ctx context.Context, messages []ChatMessage, options map[string]interface{}) (<-chan string, error) {
	model := "gpt-oss:20b" // Default model
	if m, ok := options["model"].(string); ok {
		model = m
	}

	// Convert to Ollama chat messages
	ollamaMessages := make([]ollama.OllamaChatMessage, len(messages))
	for i, msg := range messages {
		ollamaMessages[i] = ollama.OllamaChatMessage{
			Role:    msg.Role,
			Content: msg.Content,
		}
	}

	// Use streaming chat from Ollama client
	return o.client.GenerateChatStream(ctx, model, ollamaMessages, options)
}

// ListModels returns available models from Ollama
func (o *OllamaProvider) ListModels() ([]string, error) {
	return o.client.ListModels()
}

// ValidateConfig validates the Ollama provider configuration
func (o *OllamaProvider) ValidateConfig(config map[string]interface{}) error {
	// Basic validation - can be extended
	if baseURL, ok := config["base_url"].(string); ok && baseURL == "" {
		return fmt.Errorf("base_url cannot be empty")
	}
	return nil
}
