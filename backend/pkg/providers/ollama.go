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

	req := ollama.GenerateRequest{
		Mode:    "text",
		Model:   model,
		Prompt:  prompt,
		Options: options,
		Stream:  true,
		Think:   false,
	}

	resp, err := o.client.Generate(ctx, req)
	if err != nil {
		return nil, err
	}

	return resp.(<-chan string), nil
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

	req := ollama.GenerateRequest{
		Mode:     "chat",
		Model:    model,
		Messages: ollamaMessages,
		Options:  options,
		Stream:   true,
		Think:    false,
	}

	resp, err := o.client.Generate(ctx, req)
	if err != nil {
		return nil, err
	}

	stream := resp.(<-chan ollama.OllamaChatResponse)
	ch := make(chan string)
	go func() {
		defer close(ch)
		for response := range stream {
			if response.Message.Content != "" {
				ch <- response.Message.Content
			}
			if response.Done {
				return
			}
		}
	}()

	return ch, nil
}

// GenerateChatWithTools generates a response using Ollama's chat API with tool calling support
func (o *OllamaProvider) GenerateChatWithTools(ctx context.Context, messages []ChatMessage, tools []ToolDefinition, options map[string]interface{}) (<-chan ChatResponse, error) {
	model := "gpt-oss:20b" // Default model for tool calls
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

	// Convert tools to Ollama format
	var ollamaTools []ollama.OllamaTool
	for _, tool := range tools {
		ollamaTools = append(ollamaTools, ollama.OllamaTool{
			Type: tool.Type,
			Function: ollama.OllamaToolFunction{
				Name:        tool.Function.Name,
				Description: tool.Function.Description,
				Parameters:  tool.Function.Parameters,
			},
		})
	}

	req := ollama.GenerateRequest{
		Mode:     "chat",
		Model:    model,
		Messages: ollamaMessages,
		Tools:    ollamaTools,
		Options:  options,
		Stream:   true,
		Think:    false,
	}

	resp, err := o.client.Generate(ctx, req)
	if err != nil {
		return nil, err
	}

	stream := resp.(<-chan ollama.OllamaChatResponse)
	ch := make(chan ChatResponse)
	go func() {
		defer close(ch)
		for resp := range stream {
			chatResp := ChatResponse{
				Content:  resp.Message.Content,
				Thinking: resp.Message.Thinking,
				Done:     resp.Done,
			}

			// Convert Ollama tool calls to provider format
			for _, toolCall := range resp.Message.ToolCalls {
				chatResp.ToolCalls = append(chatResp.ToolCalls, ToolCall{
					Type: "function",
					Function: ToolCallFunction{
						Name:      toolCall.Function.Name,
						Arguments: toolCall.Function.Arguments,
					},
				})
			}

			ch <- chatResp
		}
	}()

	return ch, nil
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
