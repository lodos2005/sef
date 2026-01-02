package providers

import (
	"sef/pkg/litellm"
)

// LiteLLMProvider implements the LLMProvider interface for LiteLLM
// It uses both the internal LiteLLMClient for specific tasks (like model listing)
// and can use the OpenAIProvider logic for chat if needed, but here we'll
// prioritize the dedicated client logic.
type LiteLLMProvider struct {
	*OpenAIProvider
	liteClient *litellm.LiteLLMClient
}

// NewLiteLLMProvider creates a new LiteLLM provider instance
func NewLiteLLMProvider(config map[string]interface{}) *LiteLLMProvider {
	baseURL := "http://localhost:4000"
	if url, ok := config["base_url"].(string); ok && url != "" {
		baseURL = url
	}

	apiKey := ""
	if key, ok := config["api_key"].(string); ok {
		apiKey = key
	}

	// We still initialize the underlying OpenAIProvider for chat/tool support
	// because go-openai handles the complex streaming/SSE logic very well.
	openaiProv := NewOpenAIProvider(config)

	liteClient := litellm.NewLiteLLMClient(baseURL, apiKey)

	return &LiteLLMProvider{
		OpenAIProvider: openaiProv,
		liteClient:     liteClient,
	}
}

// ListModels returns available models from LiteLLM using the dedicated client
func (l *LiteLLMProvider) ListModels() ([]string, error) {
	return l.liteClient.ListModels()
}

// Inherits Generate, GenerateChat, GenerateChatWithTools, ValidateConfig from OpenAIProvider
// but overrides ListModels to ensure LiteLLM specific discovery is used.
