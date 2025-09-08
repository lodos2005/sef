package providers

import (
	"context"
	"fmt"

	openai "github.com/sashabaranov/go-openai"
)

// OpenAIProvider implements the LLMProvider interface for OpenAI
type OpenAIProvider struct {
	client *openai.Client
}

// NewOpenAIProvider creates a new OpenAI provider instance
func NewOpenAIProvider(config map[string]interface{}) *OpenAIProvider {
	apiKey := ""
	if key, ok := config["api_key"].(string); ok {
		apiKey = key
	}

	configOpenAI := openai.DefaultConfig(apiKey)
	if baseURL, ok := config["base_url"].(string); ok && baseURL != "" {
		configOpenAI.BaseURL = baseURL
	}

	client := openai.NewClientWithConfig(configOpenAI)
	return &OpenAIProvider{
		client: client,
	}
}

// Generate generates a response from OpenAI with streaming support
func (o *OpenAIProvider) Generate(ctx context.Context, prompt string, options map[string]interface{}) (<-chan string, error) {
	model := "gpt-3.5-turbo" // Default model
	if m, ok := options["model"].(string); ok {
		model = m
	}

	req := openai.ChatCompletionRequest{
		Model: model,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleUser, Content: prompt},
		},
		Stream: true,
	}

	// Handle additional options like temperature, max_tokens, etc.
	if temp, ok := options["temperature"].(float64); ok {
		req.Temperature = float32(temp)
	}
	if maxTokens, ok := options["max_tokens"].(int); ok {
		req.MaxTokens = maxTokens
	}

	stream, err := o.client.CreateChatCompletionStream(ctx, req)
	if err != nil {
		return nil, err
	}

	ch := make(chan string)
	go func() {
		defer close(ch)
		for {
			response, err := stream.Recv()
			if err != nil {
				// Log error if needed, but for now just break
				break
			}
			if len(response.Choices) > 0 {
				content := response.Choices[0].Delta.Content
				if content != "" {
					ch <- content
				}
			}
			if response.Choices[0].FinishReason != "" {
				break
			}
		}
		stream.Close()
	}()

	return ch, nil
}

// GenerateChat generates a response using OpenAI's chat API with proper message roles
func (o *OpenAIProvider) GenerateChat(ctx context.Context, messages []ChatMessage, options map[string]interface{}) (<-chan string, error) {
	model := "gpt-3.5-turbo" // Default model
	if m, ok := options["model"].(string); ok {
		model = m
	}

	// Convert to OpenAI chat messages
	openaiMessages := make([]openai.ChatCompletionMessage, len(messages))
	for i, msg := range messages {
		var role string
		switch msg.Role {
		case "user":
			role = openai.ChatMessageRoleUser
		case "assistant":
			role = openai.ChatMessageRoleAssistant
		case "system":
			role = openai.ChatMessageRoleSystem
		default:
			role = openai.ChatMessageRoleUser
		}
		openaiMessages[i] = openai.ChatCompletionMessage{
			Role:    role,
			Content: msg.Content,
		}
	}

	req := openai.ChatCompletionRequest{
		Model:    model,
		Messages: openaiMessages,
		Stream:   true,
	}

	// Handle additional options
	if temp, ok := options["temperature"].(float64); ok {
		req.Temperature = float32(temp)
	}
	if maxTokens, ok := options["max_tokens"].(int); ok {
		req.MaxTokens = maxTokens
	}

	stream, err := o.client.CreateChatCompletionStream(ctx, req)
	if err != nil {
		return nil, err
	}

	ch := make(chan string)
	go func() {
		defer close(ch)
		for {
			response, err := stream.Recv()
			if err != nil {
				break
			}
			if len(response.Choices) > 0 {
				content := response.Choices[0].Delta.Content
				if content != "" {
					ch <- content
				}
			}
			if response.Choices[0].FinishReason != "" {
				break
			}
		}
		stream.Close()
	}()

	return ch, nil
}

// ListModels returns available models from OpenAI
func (o *OpenAIProvider) ListModels() ([]string, error) {
	models, err := o.client.ListModels(context.Background())
	if err != nil {
		return nil, err
	}

	var modelNames []string
	for _, model := range models.Models {
		modelNames = append(modelNames, model.ID)
	}
	return modelNames, nil
}

// ValidateConfig validates the OpenAI provider configuration
func (o *OpenAIProvider) ValidateConfig(config map[string]interface{}) error {
	if apiKey, ok := config["api_key"].(string); !ok || apiKey == "" {
		return fmt.Errorf("api_key is required and cannot be empty")
	}
	if baseURL, ok := config["base_url"].(string); ok && baseURL == "" {
		return fmt.Errorf("base_url cannot be empty if provided")
	}
	return nil
}
