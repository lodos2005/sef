package messaging

import (
	"context"
	"encoding/json"
	"fmt"
	"sef/app/entities"
	"sef/internal/validation"
	"sef/pkg/providers"
	"strconv"

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
	SaveUserMessage(sessionID uint, content string) error
	PrepareChatMessages(session *entities.Session, userContent string) []providers.ChatMessage
	CreateAssistantMessage(sessionID uint) (*entities.Message, error)
	GenerateChatResponse(session *entities.Session, messages []providers.ChatMessage) (<-chan string, error)
	UpdateAssistantMessage(assistantMessage *entities.Message, content string)
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

// GenerateChatResponse generates the chat response stream
func (s *MessagingService) GenerateChatResponse(session *entities.Session, messages []providers.ChatMessage) (<-chan string, error) {
	// Create provider instance
	factory := &providers.ProviderFactory{}
	providerConfig := map[string]interface{}{
		"base_url": session.Chatbot.Provider.BaseURL,
	}
	provider, err := factory.NewProvider(session.Chatbot.Provider.Type, providerConfig)
	if err != nil {
		log.Error("Failed to create provider:", err)
		return nil, fmt.Errorf("failed to initialize provider: %w", err)
	}

	// Prepare options
	options := make(map[string]interface{})
	if session.Chatbot.ModelName != "" {
		options["model"] = session.Chatbot.ModelName
		log.Info("Using model from chatbot:", session.Chatbot.ModelName)
	} else {
		log.Info("Using default model")
	}

	// Generate streaming response
	stream, err := provider.GenerateChat(context.Background(), messages, options)
	if err != nil {
		log.Error("Failed to generate response:", err)
		return nil, fmt.Errorf("failed to generate response: %w", err)
	}

	return stream, nil
}

// UpdateAssistantMessage updates the assistant message with the full response
func (s *MessagingService) UpdateAssistantMessage(assistantMessage *entities.Message, content string) {
	assistantMessage.Content = content
	if err := s.DB.Save(&assistantMessage).Error; err != nil {
		log.Error("Failed to update assistant message:", err)
	}
}
