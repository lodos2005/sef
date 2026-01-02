package providers

import (
	"context"
	"fmt"
	"sef/pkg/litellm"
	"sef/pkg/ollama"
	"strings"

	openai "github.com/sashabaranov/go-openai"
)

// EmbeddingProvider defines the interface for embedding providers
type EmbeddingProvider interface {
	// GenerateEmbedding generates embeddings for a given text
	GenerateEmbedding(ctx context.Context, model string, text string) ([]float32, error)
	// ListModels returns available models for the provider
	ListModels() ([]string, error)
}

// OllamaEmbeddingProvider implements EmbeddingProvider for Ollama
type OllamaEmbeddingProvider struct {
	client *ollama.OllamaClient
}

// NewOllamaEmbeddingProvider creates a new Ollama embedding provider
func NewOllamaEmbeddingProvider(config map[string]interface{}) *OllamaEmbeddingProvider {
	baseURL := "http://localhost:11434"
	if url, ok := config["base_url"].(string); ok && url != "" {
		baseURL = url
	}

	return &OllamaEmbeddingProvider{
		client: ollama.NewOllamaClient(baseURL),
	}
}

func (o *OllamaEmbeddingProvider) GenerateEmbedding(ctx context.Context, model string, text string) ([]float32, error) {
	return o.client.GenerateEmbedding(ctx, model, text)
}

func (o *OllamaEmbeddingProvider) ListModels() ([]string, error) {
	return o.client.ListModels()
}

// OpenAIEmbeddingProvider implements EmbeddingProvider for OpenAI
type OpenAIEmbeddingProvider struct {
	client *openai.Client
}

// NewOpenAIEmbeddingProvider creates a new OpenAI embedding provider
func NewOpenAIEmbeddingProvider(config map[string]interface{}) *OpenAIEmbeddingProvider {
	apiKey := ""
	if key, ok := config["api_key"].(string); ok {
		apiKey = key
	}

	configOpenAI := openai.DefaultConfig(apiKey)
	if baseURL, ok := config["base_url"].(string); ok && baseURL != "" {
		configOpenAI.BaseURL = baseURL
	}

	client := openai.NewClientWithConfig(configOpenAI)
	return &OpenAIEmbeddingProvider{
		client: client,
	}
}

func (o *OpenAIEmbeddingProvider) GenerateEmbedding(ctx context.Context, model string, text string) ([]float32, error) {
	resp, err := o.client.CreateEmbeddings(ctx, openai.EmbeddingRequest{
		Model: openai.EmbeddingModel(model),
		Input: []string{text},
	})
	if err != nil {
		return nil, err
	}

	if len(resp.Data) == 0 {
		return nil, fmt.Errorf("no embedding data returned")
	}

	return resp.Data[0].Embedding, nil
}

func (o *OpenAIEmbeddingProvider) ListModels() ([]string, error) {
	models, err := o.client.ListModels(context.Background())
	if err != nil {
		return nil, err
	}

	var modelNames []string
	for _, model := range models.Models {
		if strings.Contains(strings.ToLower(model.ID), "embed") {
			modelNames = append(modelNames, model.ID)
		}
	}
	if len(modelNames) == 0 {
		for _, model := range models.Models {
			modelNames = append(modelNames, model.ID)
		}
	}
	return modelNames, nil
}

// LiteLLMEmbeddingProvider implements EmbeddingProvider for LiteLLM
type LiteLLMEmbeddingProvider struct {
	client *litellm.LiteLLMClient
}

// NewLiteLLMEmbeddingProvider creates a new LiteLLM embedding provider
func NewLiteLLMEmbeddingProvider(config map[string]interface{}) *LiteLLMEmbeddingProvider {
	baseURL := "http://localhost:4000"
	if url, ok := config["base_url"].(string); ok && url != "" {
		baseURL = url
	}

	apiKey := ""
	if key, ok := config["api_key"].(string); ok {
		apiKey = key
	}

	return &LiteLLMEmbeddingProvider{
		client: litellm.NewLiteLLMClient(baseURL, apiKey),
	}
}

func (o *LiteLLMEmbeddingProvider) GenerateEmbedding(ctx context.Context, model string, text string) ([]float32, error) {
	return o.client.GenerateEmbedding(ctx, model, text)
}

func (o *LiteLLMEmbeddingProvider) ListModels() ([]string, error) {
	return o.client.ListModels()
}

// Factory for embedding providers
type EmbeddingProviderFactory struct{}

func (f *EmbeddingProviderFactory) NewProvider(providerType string, config map[string]interface{}) (EmbeddingProvider, error) {
	switch providerType {
	case "ollama":
		return NewOllamaEmbeddingProvider(config), nil
	case "openai":
		return NewOpenAIEmbeddingProvider(config), nil
	case "litellm":
		return NewLiteLLMEmbeddingProvider(config), nil
	default:
		return nil, fmt.Errorf("unsupported embedding provider type: %s", providerType)
	}
}
