package messaging

import (
	"context"
	"encoding/json"
	"fmt"
	"sef/app/entities"
	"sef/internal/validation"
	"sef/pkg/providers"
	"sef/pkg/toolrunners"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3/log"
	"gorm.io/gorm"
)

type SendMessageRequest struct {
	Content string `json:"content" validate:"required,min=1"`
}

type MessagingService struct {
	DB *gorm.DB
}

type MessagingServiceInterface interface {
	ValidateAndParseSessionID(sessionIDStr string) (uint, error)
	GetSessionByIDAndUser(sessionID, userID uint) (*entities.Session, error)
	ParseSendMessageRequest(body []byte) (*SendMessageRequest, error)
	LoadSessionWithChatbotAndMessages(sessionID, userID uint) (*entities.Session, error)
	LoadSessionWithChatbotToolsAndMessages(sessionID, userID uint) (*entities.Session, error)
	SaveUserMessage(sessionID uint, content string) error
	PrepareChatMessages(session *entities.Session, userContent string) []providers.ChatMessage
	CreateAssistantMessage(sessionID uint) (*entities.Message, error)
	CreateToolMessage(sessionID uint, content string) (*entities.Message, error)
	GenerateChatResponse(session *entities.Session, messages []providers.ChatMessage) (<-chan string, *entities.Message, error)
	UpdateAssistantMessage(assistantMessage *entities.Message, content string)
	ConvertToolsToDefinitions(tools []entities.Tool) []providers.ToolDefinition
	ExecuteToolCall(ctx context.Context, toolCall providers.ToolCall) (string, error)
}

// ValidateAndParseSessionID validates and parses session ID from string
func (s *MessagingService) ValidateAndParseSessionID(sessionIDStr string) (uint, error) {
	sessionID, err := strconv.ParseUint(sessionIDStr, 10, 32)
	if err != nil {
		return 0, fmt.Errorf("invalid session ID: %w", err)
	}
	return uint(sessionID), nil
}

// GetSessionByIDAndUser retrieves a session by ID and user ID
func (s *MessagingService) GetSessionByIDAndUser(sessionID, userID uint) (*entities.Session, error) {
	var session entities.Session
	if err := s.DB.
		Where("id = ? AND user_id = ?", sessionID, userID).
		First(&session).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("chat session not found")
		}
		log.Error("Failed to fetch chat session:", err)
		return nil, fmt.Errorf("failed to fetch chat session: %w", err)
	}
	return &session, nil
}

// ParseSendMessageRequest parses and validates the send message request from body bytes
func (s *MessagingService) ParseSendMessageRequest(body []byte) (*SendMessageRequest, error) {
	var req SendMessageRequest
	if err := json.Unmarshal(body, &req); err != nil {
		return nil, fmt.Errorf("invalid request body: %w", err)
	}

	if err := validation.Validate(req); err != nil {
		return nil, fmt.Errorf("validation failed: %v", err)
	}

	return &req, nil
}

// LoadSessionWithChatbotAndMessages loads session with chatbot and messages
func (s *MessagingService) LoadSessionWithChatbotAndMessages(sessionID, userID uint) (*entities.Session, error) {
	var session entities.Session
	if err := s.DB.
		Where("id = ? AND user_id = ?", sessionID, userID).
		Preload("Chatbot").
		Preload("Chatbot.Provider").
		Preload("Messages").
		First(&session).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("chat session not found")
		}
		log.Error("Failed to fetch chat session:", err)
		return nil, fmt.Errorf("failed to fetch chat session: %w", err)
	}
	return &session, nil
}

// LoadSessionWithChatbotToolsAndMessages loads session with chatbot, tools, and messages
func (s *MessagingService) LoadSessionWithChatbotToolsAndMessages(sessionID, userID uint) (*entities.Session, error) {
	var session entities.Session
	if err := s.DB.
		Where("id = ? AND user_id = ?", sessionID, userID).
		Preload("Chatbot").
		Preload("Chatbot.Provider").
		Preload("Chatbot.Tools").
		Preload("Messages").
		First(&session).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("chat session not found")
		}
		log.Error("Failed to fetch chat session:", err)
		return nil, fmt.Errorf("failed to fetch chat session: %w", err)
	}
	return &session, nil
}

// ConvertToolsToDefinitions converts entity tools to provider tool definitions
func (s *MessagingService) ConvertToolsToDefinitions(tools []entities.Tool) []providers.ToolDefinition {
	var definitions []providers.ToolDefinition
	for _, tool := range tools {
		// Convert JSONB parameters to map
		parameters := make(map[string]interface{})
		if len(tool.Parameters) > 0 {
			// Try to convert the JSONB array to a map
			if paramMap, ok := tool.Parameters[0].(map[string]interface{}); ok {
				parameters = paramMap
			}
		}

		definition := providers.ToolDefinition{
			Type: "function",
			Function: providers.ToolFunction{
				Name:        tool.Name,
				Description: tool.Description,
				Parameters:  parameters,
			},
		}
		definitions = append(definitions, definition)
	}
	return definitions
}

// ExecuteToolCall executes a tool call and returns the result
func (s *MessagingService) ExecuteToolCall(ctx context.Context, toolCall providers.ToolCall) (string, error) {
	// Find the tool by name (this would need to be optimized in production)
	var tool entities.Tool
	if err := s.DB.Where("name = ?", toolCall.Function.Name).First(&tool).Error; err != nil {
		return "", fmt.Errorf("tool not found: %s", toolCall.Function.Name)
	}

	// Handle arguments - they might be raw JSON string or parsed map
	var args map[string]interface{}
	if rawArgs, ok := toolCall.Function.Arguments["raw"].(string); ok {
		// Parse the raw JSON string
		if err := json.Unmarshal([]byte(rawArgs), &args); err != nil {
			return "", fmt.Errorf("failed to parse tool arguments: %w", err)
		}
	} else {
		// Already parsed
		args = toolCall.Function.Arguments
	}

	// Create tool runner
	factory := &toolrunners.ToolRunnerFactory{}
	runner, err := factory.NewToolRunner(tool.Type, tool.Config, tool.Parameters)
	if err != nil {
		return "", fmt.Errorf("failed to create tool runner: %w", err)
	}

	// Execute tool
	result, err := runner.Execute(ctx, args)
	if err != nil {
		return "", fmt.Errorf("tool execution failed: %w", err)
	}

	// Convert result to string
	resultJSON, err := json.Marshal(result)
	if err != nil {
		return "", fmt.Errorf("failed to marshal tool result: %w", err)
	}

	return string(resultJSON), nil
}

// SaveUserMessage saves the user message to database
func (s *MessagingService) SaveUserMessage(sessionID uint, content string) error {
	userMessage := entities.Message{
		SessionID: sessionID,
		Role:      "user",
		Content:   content,
	}

	if err := s.DB.Create(&userMessage).Error; err != nil {
		log.Error("Failed to save user message:", err)
		return fmt.Errorf("failed to save message: %w", err)
	}

	return nil
}

// PrepareChatMessages prepares the messages array for the chat API
func (s *MessagingService) PrepareChatMessages(session *entities.Session, userContent string) []providers.ChatMessage {
	var messages []providers.ChatMessage

	// Add system message if system prompt exists
	if session.Chatbot.SystemPrompt != "" {
		messages = append(messages, providers.ChatMessage{
			Role:    "system",
			Content: session.Chatbot.SystemPrompt,
		})
	}

	// Add current chat session messages
	for _, msg := range session.Messages {
		messages = append(messages, providers.ChatMessage{
			Role:    msg.Role,
			Content: msg.Content,
		})
	}

	// Add current user message
	messages = append(messages, providers.ChatMessage{
		Role:    "user",
		Content: userContent,
	})

	return messages
}

// CreateAssistantMessage creates an empty assistant message record
func (s *MessagingService) CreateAssistantMessage(sessionID uint) (*entities.Message, error) {
	assistantMessage := entities.Message{
		SessionID: sessionID,
		Role:      "assistant",
		Content:   "",
	}

	if err := s.DB.Create(&assistantMessage).Error; err != nil {
		log.Error("Failed to create assistant message:", err)
		return nil, fmt.Errorf("failed to create message record: %w", err)
	}

	return &assistantMessage, nil
}

// CreateToolMessage creates a tool message record
func (s *MessagingService) CreateToolMessage(sessionID uint, content string) (*entities.Message, error) {
	toolMessage := entities.Message{
		SessionID: sessionID,
		Role:      "tool",
		Content:   content,
	}

	if err := s.DB.Create(&toolMessage).Error; err != nil {
		log.Error("Failed to create tool message:", err)
		return nil, fmt.Errorf("failed to create tool message record: %w", err)
	}

	return &toolMessage, nil
}

// GenerateChatResponse generates the chat response stream with tool support
func (s *MessagingService) GenerateChatResponse(session *entities.Session, messages []providers.ChatMessage) (<-chan string, *entities.Message, error) {
	// Create provider instance
	factory := &providers.ProviderFactory{}
	providerConfig := map[string]interface{}{
		"base_url": session.Chatbot.Provider.BaseURL,
	}
	provider, err := factory.NewProvider(session.Chatbot.Provider.Type, providerConfig)
	if err != nil {
		log.Error("Failed to create provider:", err)
		return nil, nil, fmt.Errorf("failed to initialize provider: %w", err)
	}

	// Prepare options
	options := make(map[string]interface{})
	if session.Chatbot.ModelName != "" {
		options["model"] = session.Chatbot.ModelName
		log.Info("Using model from chatbot:", session.Chatbot.ModelName)
	} else {
		log.Info("Using default model")
	}

	// Convert tools to definitions
	toolDefinitions := s.ConvertToolsToDefinitions(session.Chatbot.Tools)

	// Use tool-enabled chat generation
	chatStream, err := provider.GenerateChatWithTools(context.Background(), messages, toolDefinitions, options)
	if err != nil {
		log.Error("Failed to generate response:", err)
		return nil, nil, fmt.Errorf("failed to generate response: %w", err)
	}

	// Create output channel
	outputCh := make(chan string)

	// Create first assistant message synchronously
	firstAssistant, err := s.CreateAssistantMessage(session.ID)
	if err != nil {
		log.Error("Failed to create assistant message:", err)
		return nil, nil, fmt.Errorf("failed to create assistant message: %w", err)
	}
	finalAssistant := firstAssistant

	go func() {
		defer close(outputCh)

		var assistantContent strings.Builder
		var followupContent strings.Builder
		thinkingStarted := false

		for response := range chatStream {
			// Handle thinking tokens
			if response.Thinking != "" {
				if !thinkingStarted {
					outputCh <- "<think>"
					thinkingStarted = true
				}
				outputCh <- response.Thinking
				assistantContent.WriteString("<think>" + response.Thinking)
			} else if thinkingStarted {
				outputCh <- "</think>"
				thinkingStarted = false
				assistantContent.WriteString("</think>")
			}

			// Handle content
			if response.Content != "" {
				outputCh <- response.Content
				assistantContent.WriteString(response.Content)
			}

			// Handle tool calls
			if len(response.ToolCalls) > 0 {
				// Add tool calls to content
				for _, toolCall := range response.ToolCalls {
					args, _ := json.Marshal(toolCall.Function.Arguments)
					toolCallStr := fmt.Sprintf("<tool_call>%s(%s)</tool_call>", toolCall.Function.Name, string(args))
					assistantContent.WriteString(toolCallStr)
				}

				// Save first assistant message
				s.UpdateAssistantMessage(firstAssistant, assistantContent.String())

				// Process tool calls
				for _, toolCall := range response.ToolCalls {
					toolResult, err := s.ExecuteToolCall(context.Background(), toolCall)
					if err != nil {
						log.Error("Tool execution failed:", err)
						toolResult = fmt.Sprintf("[Error executing tool %s: %v]", toolCall.Function.Name, err)
					}

					// Save tool message
					_, err = s.CreateToolMessage(session.ID, toolResult)
					if err != nil {
						log.Error("Failed to save tool message:", err)
					}

					// Add to messages for followup
					toolMessage := providers.ChatMessage{
						Role:    "tool",
						Content: toolResult,
					}
					messages = append(messages, toolMessage)
				}

				// Create final assistant message
				finalAssistant, err = s.CreateAssistantMessage(session.ID)
				if err != nil {
					log.Error("Failed to create final assistant message:", err)
					// Close channel to signal error
					close(outputCh)
					return
				}

				// Generate followup
				followupStream, err := provider.GenerateChatWithTools(context.Background(), messages, toolDefinitions, options)
				if err != nil {
					log.Error("Failed to generate followup:", err)
					outputCh <- fmt.Sprintf("[Error generating followup: %v]", err)
					return
				}

				// Process followup stream
				thinkingStarted = false
				for followupResp := range followupStream {
					if followupResp.Thinking != "" {
						if !thinkingStarted {
							outputCh <- "<think>"
							thinkingStarted = true
						}
						outputCh <- followupResp.Thinking
						followupContent.WriteString("<think>" + followupResp.Thinking)
					} else if thinkingStarted {
						outputCh <- "</think>"
						thinkingStarted = false
						followupContent.WriteString("</think>")
					}

					if followupResp.Content != "" {
						outputCh <- followupResp.Content
						followupContent.WriteString(followupResp.Content)
					}

					if followupResp.Done {
						if thinkingStarted {
							outputCh <- "</think>"
							thinkingStarted = false
						}
						break
					}
				}

				// Update final assistant message
				s.UpdateAssistantMessage(finalAssistant, followupContent.String())
			}

			if response.Done {
				if thinkingStarted {
					outputCh <- "</think>"
				}
				// If no tool calls, update first assistant
				if finalAssistant == firstAssistant {
					s.UpdateAssistantMessage(firstAssistant, assistantContent.String())
				}
				return
			}
		}
	}()

	return outputCh, finalAssistant, nil
}

// UpdateAssistantMessage updates the assistant message with the full response
func (s *MessagingService) UpdateAssistantMessage(assistantMessage *entities.Message, content string) {
	if assistantMessage == nil {
		log.Error("Attempted to update nil assistant message")
		return
	}
	assistantMessage.Content = content
	if err := s.DB.Save(&assistantMessage).Error; err != nil {
		log.Error("Failed to update assistant message:", err)
	}
}
