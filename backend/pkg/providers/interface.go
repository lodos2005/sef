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
	// GenerateChatWithTools generates a response with tool calling support
	GenerateChatWithTools(ctx context.Context, messages []ChatMessage, tools []ToolDefinition, options map[string]interface{}) (<-chan ChatResponse, error)
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

// ToolDefinition represents a tool that can be called by the LLM
type ToolDefinition struct {
	Type     string       `json:"type"`
	Function ToolFunction `json:"function"`
}

// ToolFunction represents the function definition for a tool
type ToolFunction struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Parameters  map[string]interface{} `json:"parameters"`
}

// ChatResponse represents a streaming response that can contain content, tool calls, or thinking
type ChatResponse struct {
	Content   string     `json:"content,omitempty"`
	ToolCalls []ToolCall `json:"tool_calls,omitempty"`
	Thinking  string     `json:"thinking,omitempty"`
	Done      bool       `json:"done"`
}

// ToolCall represents a tool call from the LLM
type ToolCall struct {
	ID       string           `json:"id"`
	Type     string           `json:"type"`
	Function ToolCallFunction `json:"function"`
}

// ToolCallFunction represents the function call details
type ToolCallFunction struct {
	Name      string                 `json:"name"`
	Arguments map[string]interface{} `json:"arguments"`
}

// ProviderFactory creates provider instances
type ProviderFactory struct{}

// NewProvider creates a new provider instance based on type
func (f *ProviderFactory) NewProvider(providerType string, config map[string]interface{}) (LLMProvider, error) {
	switch providerType {
	case "ollama":
		return NewOllamaProvider(config), nil
	case "openai", "litellm":
		return NewOpenAIProvider(config), nil
	default:
		return nil, fmt.Errorf("unsupported provider type: %s", providerType)
	}
}
