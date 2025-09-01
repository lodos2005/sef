package ollama

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// OllamaClient handles Ollama API interactions
type OllamaClient struct {
	baseURL string
	client  *http.Client
}

// OllamaGenerateRequest represents the request for text generation
type OllamaGenerateRequest struct {
	Model   string                 `json:"model"`
	Prompt  string                 `json:"prompt"`
	Stream  bool                   `json:"stream"`
	Options map[string]interface{} `json:"options,omitempty"`
}

// OllamaGenerateResponse represents the response from generation
type OllamaGenerateResponse struct {
	Response string `json:"response"`
	Done     bool   `json:"done"`
}

// OllamaListResponse represents the response from /api/tags
type OllamaListResponse struct {
	Models []OllamaModel `json:"models"`
}

// OllamaModel represents a model in Ollama
type OllamaModel struct {
	Name string `json:"name"`
}

// NewOllamaClient creates a new Ollama client
func NewOllamaClient(baseURL string) *OllamaClient {
	if baseURL == "" {
		baseURL = "http://localhost:11434"
	}

	return &OllamaClient{
		baseURL: baseURL,
		client:  &http.Client{},
	}
}

// GenerateText generates text using Ollama (non-streaming)
func (oc *OllamaClient) GenerateText(ctx context.Context, model, prompt string, options map[string]interface{}) (string, error) {
	req := OllamaGenerateRequest{
		Model:   model,
		Prompt:  prompt,
		Stream:  false, // Non-streaming
		Options: options,
	}

	reqBody, err := json.Marshal(req)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", oc.baseURL+"/api/generate", bytes.NewBuffer(reqBody))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := oc.client.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("ollama API error: %s", string(body))
	}

	var ollamaResp OllamaGenerateResponse
	if err := json.NewDecoder(resp.Body).Decode(&ollamaResp); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	return strings.TrimSpace(ollamaResp.Response), nil
}

// GenerateTextStream generates text using Ollama with streaming support
func (oc *OllamaClient) GenerateTextStream(ctx context.Context, model, prompt string, options map[string]interface{}) (<-chan string, error) {
	req := OllamaGenerateRequest{
		Model:   model,
		Prompt:  prompt,
		Stream:  true,
		Options: options,
	}

	reqBody, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", oc.baseURL+"/api/generate", bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := oc.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}

	ch := make(chan string)

	go func() {
		defer resp.Body.Close()
		defer close(ch)

		decoder := json.NewDecoder(resp.Body)
		for {
			var ollamaResp OllamaGenerateResponse
			if err := decoder.Decode(&ollamaResp); err != nil {
				if err != io.EOF {
					// Send error as message
					ch <- fmt.Sprintf("Error: %v", err)
				}
				return
			}

			ch <- ollamaResp.Response

			if ollamaResp.Done {
				return
			}
		}
	}()

	return ch, nil
}

// ListModels returns available models from Ollama
func (oc *OllamaClient) ListModels() ([]string, error) {
	resp, err := oc.client.Get(oc.baseURL + "/api/tags")
	if err != nil {
		return nil, fmt.Errorf("failed to fetch models: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("ollama API error: %s", string(body))
	}

	var result OllamaListResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	models := make([]string, len(result.Models))
	for i, model := range result.Models {
		models[i] = model.Name
	}

	return models, nil
}

// IsModelAvailable checks if a specific model is available
func (oc *OllamaClient) IsModelAvailable(modelName string) (bool, error) {
	models, err := oc.ListModels()
	if err != nil {
		return false, err
	}

	for _, model := range models {
		if model == modelName {
			return true, nil
		}
	}

	return false, nil
}

// PullModel pulls a model from the Ollama registry
func (oc *OllamaClient) PullModel(ctx context.Context, modelName string) error {
	req := map[string]string{"name": modelName}
	reqBody, err := json.Marshal(req)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", oc.baseURL+"/api/pull", bytes.NewBuffer(reqBody))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := oc.client.Do(httpReq)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to pull model: %s", string(body))
	}

	return nil
}
