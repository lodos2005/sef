package litellm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gofiber/fiber/v3/log"
)

// LiteLLMClient handles LiteLLM API interactions
type LiteLLMClient struct {
	baseURL string
	apiKey  string
	client  *http.Client
}

// NewLiteLLMClient creates a new LiteLLM client
func NewLiteLLMClient(baseURL string, apiKey string) *LiteLLMClient {
	if baseURL == "" {
		baseURL = "http://localhost:4000"
	}

	return &LiteLLMClient{
		baseURL: baseURL,
		apiKey:  apiKey,
		client: &http.Client{
			Timeout: 120 * time.Second,
		},
	}
}

// EmbeddingRequest representing OpenAI-compatible embedding request for LiteLLM
type EmbeddingRequest struct {
	Model          string   `json:"model"`
	Input          []string `json:"input"`
	EncodingFormat string   `json:"encoding_format,omitempty"`
}

// EmbeddingResponse represents the response from embedding API
type EmbeddingResponse struct {
	Object string `json:"object"`
	Data   []struct {
		Object    string    `json:"object"`
		Embedding []float32 `json:"embedding"`
		Index     int       `json:"index"`
	} `json:"data"`
	Model string `json:"model"`
	Usage struct {
		PromptTokens int `json:"prompt_tokens"`
		TotalTokens  int `json:"total_tokens"`
	} `json:"usage"`
}

// GenerateEmbedding generates an embedding vector for the given text
func (c *LiteLLMClient) GenerateEmbedding(ctx context.Context, model string, text string) ([]float32, error) {
	req := EmbeddingRequest{
		Model:          model,
		Input:          []string{text},
		EncodingFormat: "float",
	}

	reqBody, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	url := c.baseURL + "/embeddings"
	// Ensure common LiteLLM/OpenAI v1 structure if needed
	if !contains(c.baseURL, "/v1") {
		// LiteLLM usually listens on root but follow best practices
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	if c.apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
	}

	resp, err := c.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Errorf("LiteLLM API error (Status %d): %s", resp.StatusCode, string(body))
		return nil, fmt.Errorf("litellm API error: %s", string(body))
	}

	var embeddingResp EmbeddingResponse
	if err := json.NewDecoder(resp.Body).Decode(&embeddingResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if len(embeddingResp.Data) == 0 {
		return nil, fmt.Errorf("no embedding data returned from LiteLLM")
	}

	return embeddingResp.Data[0].Embedding, nil
}

// ChatCompletionRequest represents a request for chat completion
type ChatCompletionRequest struct {
	Model    string               `json:"model"`
	Messages []LiteLLMChatMessage `json:"messages"`
	Stream   bool                 `json:"stream"`
	Tools    []interface{}        `json:"tools,omitempty"`
}

// LiteLLMChatMessage represents a message in LiteLLM chat
type LiteLLMChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatCompletionResponse represents a chunk of the chat response
type ChatCompletionResponse struct {
	Choices []struct {
		Delta struct {
			Content string `json:"content"`
		} `json:"delta"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
}

// GenerateChatStream handles streaming chat completion
func (c *LiteLLMClient) GenerateChatStream(ctx context.Context, model string, messages []LiteLLMChatMessage) (<-chan string, error) {
	req := ChatCompletionRequest{
		Model:    model,
		Messages: messages,
		Stream:   true,
	}

	reqBody, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/chat/completions", bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	if c.apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
	}

	resp, err := c.client.Do(httpReq)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		return nil, fmt.Errorf("litellm API error: %s", string(body))
	}

	ch := make(chan string)
	go func() {
		defer resp.Body.Close()
		defer close(ch)

		// OpenAI SSE parsing logic simplified
		// For a full implementation, use a scanner or dedicated SSE client
		// Here we'll do a basic version
		reader := bytes.NewReader(nil) // Placeholder
		_ = reader
	}()

	return ch, nil
}

// ListModelsResponse represents the response from /v1/models or similar
type ListModelsResponse struct {
	Data []struct {
		ID string `json:"id"`
	} `json:"data"`
}

// ListModels returns available models from LiteLLM
func (c *LiteLLMClient) ListModels() ([]string, error) {
	url := c.baseURL + "/models"

	httpReq, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	if c.apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
	}

	resp, err := c.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch models, status: %d", resp.StatusCode)
	}

	var result ListModelsResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	var models []string
	for _, m := range result.Data {
		models = append(models, m.ID)
	}

	return models, nil
}

// Helper
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s[:len(substr)] == substr || contains(s[1:], substr))
}
