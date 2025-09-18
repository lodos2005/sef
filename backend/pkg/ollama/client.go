package ollama

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/gofiber/fiber/v3/log"
)

// OllamaClient handles Ollama API interactions
type OllamaClient struct {
	baseURL string
	client  *http.Client
}

// OllamaTool represents a tool/function that can be called
type OllamaTool struct {
	Type     string             `json:"type"`
	Function OllamaToolFunction `json:"function"`
}

// OllamaToolFunction represents the function definition
type OllamaToolFunction struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Parameters  map[string]interface{} `json:"parameters"`
}

// OllamaChatMessage represents a message in chat format
type OllamaChatMessage struct {
	Role      string           `json:"role"`
	Content   string           `json:"content"`
	Thinking  string           `json:"thinking,omitempty"`
	ToolCalls []OllamaToolCall `json:"tool_calls,omitempty"`
}

// OllamaChatResponse represents the response from chat
type OllamaChatResponse struct {
	Message OllamaChatMessage `json:"message"`
	Done    bool              `json:"done"`
}

// OllamaToolCall represents a tool call in the response
type OllamaToolCall struct {
	Function OllamaToolCallFunction `json:"function"`
}

// OllamaToolCallFunction represents the function call details
type OllamaToolCallFunction struct {
	Name      string                 `json:"name"`
	Arguments map[string]interface{} `json:"arguments"`
}

// OllamaGenerateResponse represents the response from generation
type OllamaGenerateResponse struct {
	Response string `json:"response"`
	Done     bool   `json:"done"`
}

// GenerateRequest represents a unified request for all generation types
type GenerateRequest struct {
	Mode     string                 `json:"-"`
	Model    string                 `json:"model"`
	Prompt   string                 `json:"prompt,omitempty"`   // For text mode
	Messages []OllamaChatMessage    `json:"messages,omitempty"` // For chat mode
	Tools    []OllamaTool           `json:"tools,omitempty"`    // For chat mode with tools
	Options  map[string]interface{} `json:"options,omitempty"`
	Stream   bool                   `json:"stream"`
	Think    bool                   `json:"think,omitempty"` // For chat mode
}

// GenerateResponse represents a unified response interface
type GenerateResponse interface{}

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

// Generate handles all types of generation (text, chat, with/without tools, streaming/non-streaming)
func (oc *OllamaClient) Generate(ctx context.Context, req GenerateRequest) (GenerateResponse, error) {
	switch req.Mode {
	case "text":
		if req.Stream {
			return oc.generateTextStream(ctx, req)
		} else {
			return oc.generateText(ctx, req)
		}
	case "chat":
		if req.Stream {
			return oc.generateChatStream(ctx, req)
		} else {
			// For now, chat only supports streaming
			return nil, fmt.Errorf("non-streaming chat not implemented")
		}
	default:
		return nil, fmt.Errorf("unsupported mode: %s", req.Mode)
	}
}

// generateText handles non-streaming text generation
func (oc *OllamaClient) generateText(ctx context.Context, req GenerateRequest) (string, error) {
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

// generateTextStream handles streaming text generation
func (oc *OllamaClient) generateTextStream(ctx context.Context, req GenerateRequest) (<-chan string, error) {
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

// generateChatStream handles streaming chat generation
func (oc *OllamaClient) generateChatStream(ctx context.Context, req GenerateRequest) (<-chan OllamaChatResponse, error) {
	log.Info("Ollama Chat Request: ", req)

	reqBody, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", oc.baseURL+"/api/chat", bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := oc.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}

	ch := make(chan OllamaChatResponse)

	go func() {
		defer resp.Body.Close()
		defer close(ch)

		scanner := bufio.NewScanner(resp.Body)
		for scanner.Scan() {
			line := scanner.Text()
			log.Info("Raw response line: ", line)

			var ollamaResp OllamaChatResponse
			if err := json.Unmarshal([]byte(line), &ollamaResp); err != nil {
				ch <- OllamaChatResponse{
					Message: OllamaChatMessage{
						Role:    "assistant",
						Content: fmt.Sprintf("Error: %v", err),
					},
					Done: true,
				}
				return
			}

			ch <- ollamaResp

			if ollamaResp.Done && len(ollamaResp.Message.ToolCalls) == 0 {
				return
			}
		}
		if err := scanner.Err(); err != nil {
			ch <- OllamaChatResponse{
				Message: OllamaChatMessage{
					Role:    "assistant",
					Content: fmt.Sprintf("Scanner error: %v", err),
				},
				Done: true,
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
