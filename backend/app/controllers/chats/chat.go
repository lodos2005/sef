package chats

import (
	"context"
	"encoding/json"
	"fmt"
	"sef/app/entities"
	"sef/internal/database"
	"sef/internal/paginator"
	"sef/internal/search"
	"sef/internal/validation"
	"sef/pkg/providers"
	"sef/utils"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"gorm.io/gorm"
)

type VercelPart struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type CreateSessionRequest struct {
	Title     string `json:"title" validate:"required,min=1,max=255"`
	ChatbotID uint   `json:"chatbot_id" validate:"required"`
}

type UpdateSessionRequest struct {
	Title    *string `json:"title,omitempty" validate:"omitempty,min=1,max=255"`
	IsActive *bool   `json:"is_active,omitempty"`
}

type SendMessageRequest struct {
	ID       string         `json:"id"`
	Messages []VercelMessage `json:"messages" validate:"required,min=1"`
}

// Admin functions for managing all chat sessions (not user-specific)

// GetAllSessions returns all chat sessions for admin panel
func GetAllSessions(c fiber.Ctx) error {
	var items []*entities.ChatSession
	db := database.Connection().Model(&entities.ChatSession{}).Preload("User").Preload("Chatbot").Preload("Messages")

	if c.Query("search") != "" {
		search.Search(c.Query("search"), db)
	}

	page, err := paginator.New(db, c).Paginate(&items)
	if err != nil {
		return err
	}

	return c.JSON(page)
}

// GetSessionByID returns a specific chat session by ID for admin
func GetSessionByID(c fiber.Ctx) error {
	var item *entities.ChatSession
	if err := database.Connection().Preload("User").Preload("Chatbot").Preload("Messages").First(&item, c.Params("id")).Error; err != nil {
		return err
	}

	return c.JSON(item)
}

// CreateSessionAdmin creates a new chat session for admin
func CreateSessionAdmin(c fiber.Ctx) error {
	var payload *entities.ChatSession
	if err := c.Bind().JSON(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Get current user (admin)
	currentUser, err := utils.GetUserFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// If user_id is not provided, use current user's ID
	if payload.UserID == 0 {
		payload.UserID = currentUser.ID
	}

	// Validate required fields
	if payload.ChatbotID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "chatbot_id is required",
		})
	}

	// Verify user exists
	_, err = utils.GetUserByID(payload.UserID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "User not found",
			"hint":  "The specified user_id does not exist in the database",
		})
	}

	// Verify chatbot exists
	var chatbot entities.Chatbot
	if err := database.Connection().Where("id = ?", payload.ChatbotID).First(&chatbot).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Chatbot not found",
			"hint":  "The specified chatbot_id does not exist in the database",
		})
	}

	if err := database.Connection().Create(&payload).Error; err != nil {
		log.Error("Failed to create chat session:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create chat session",
		})
	}

	return c.JSON(payload)
}

// UpdateSessionAdmin updates a chat session for admin
func UpdateSessionAdmin(c fiber.Ctx) error {
	var item *entities.ChatSession
	if err := database.Connection().First(&item, c.Params("id")).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Chat session not found",
			})
		}
		log.Error("Failed to fetch chat session:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch chat session",
		})
	}

	var payload *entities.ChatSession
	if err := c.Bind().JSON(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate user_id if provided
	if payload.UserID != 0 {
		_, err := utils.GetUserByID(payload.UserID)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "User not found",
			})
		}
		item.UserID = payload.UserID
	}

	// Validate chatbot_id if provided
	if payload.ChatbotID != 0 {
		var chatbot entities.Chatbot
		if err := database.Connection().Where("id = ?", payload.ChatbotID).First(&chatbot).Error; err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Chatbot not found",
			})
		}
		item.ChatbotID = payload.ChatbotID
	}

	// Update other fields
	if payload.Title != "" {
		item.Title = payload.Title
	}
	if payload.IsActive != item.IsActive {
		item.IsActive = payload.IsActive
	}

	if err := database.Connection().Save(&item).Error; err != nil {
		log.Error("Failed to update chat session:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update chat session",
		})
	}

	return c.JSON(item)
}

// DeleteSessionAdmin deletes a chat session for admin
func DeleteSessionAdmin(c fiber.Ctx) error {
	if err := database.Connection().Delete(&entities.ChatSession{}, c.Params("id")).Error; err != nil {
		return err
	}

	return c.JSON(fiber.Map{"message": "Chat session deleted successfully"})
}

// GetUserSessions returns all chat sessions for the authenticated user
func GetUserSessions(c fiber.Ctx) error {
	// Verify user exists in database
	user, err := utils.VerifyUserFromContext(c)
	if err != nil {
		if err.Error() == "user account is deactivated" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "User account is deactivated",
			})
		}
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	var sessions []entities.ChatSession
	if err := database.Connection().
		Where("user_id = ?", user.ID).
		Preload("Chatbot").
		Preload("Chatbot.Provider").
		Order("created_at DESC").
		Find(&sessions).Error; err != nil {
		log.Error("Failed to fetch chat sessions:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch chat sessions",
		})
	}

	return c.JSON(fiber.Map{
		"sessions": sessions,
	})
}

// GetSession returns a specific chat session with messages
func GetSession(c fiber.Ctx) error {
	sessionID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid session ID",
		})
	}

	// Verify user exists in database
	user, err := utils.VerifyUserFromContext(c)
	if err != nil {
		if err.Error() == "user account is deactivated" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "User account is deactivated",
			})
		}
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	var session entities.ChatSession
	if err := database.Connection().
		Where("id = ? AND user_id = ?", sessionID, user.ID).
		Preload("Chatbot").
		Preload("Chatbot.Provider").
		Preload("Messages", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at ASC")
		}).
		First(&session).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Chat session not found",
			})
		}
		log.Error("Failed to fetch chat session:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch chat session",
		})
	}

	return c.JSON(fiber.Map{
		"session": session,
	})
}

// CreateSession creates a new chat session
func CreateSession(c fiber.Ctx) error {
	var req CreateSessionRequest
	body := c.Body()
	log.Info("CreateSession request body:", string(body))
	if err := json.Unmarshal(body, &req); err != nil {
		log.Error("Failed to unmarshal CreateSession request body:", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if err := validation.Validate(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"errors": err,
		})
	}

	// Verify user exists in database
	user, err := utils.VerifyUserFromContext(c)
	if err != nil {
		if err.Error() == "user account is deactivated" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "User account is deactivated",
			})
		}
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	var chatbot entities.Chatbot
	if err := database.Connection().
		Where("id = ? AND (is_public = ? OR user_id = ?)", req.ChatbotID, true, user.ID).
		First(&chatbot).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Chatbot not found or access denied",
			})
		}
		log.Error("Failed to verify chatbot:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to verify chatbot",
		})
	}

	session := entities.ChatSession{
		UserID:    user.ID,
		ChatbotID: req.ChatbotID,
		Title:     req.Title,
		IsActive:  true,
	}

	if err := database.Connection().Create(&session).Error; err != nil {
		log.Error("Failed to create chat session:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create chat session",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"session": session,
		"message": "Chat session created successfully",
	})
}

// UpdateSession updates a chat session
func UpdateSession(c fiber.Ctx) error {
	sessionID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid session ID",
		})
	}

	// Verify user exists in database
	user, err := utils.VerifyUserFromContext(c)
	if err != nil {
		if err.Error() == "user account is deactivated" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "User account is deactivated",
			})
		}
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	var session entities.ChatSession
	if err := database.Connection().
		Where("id = ? AND user_id = ?", sessionID, user.ID).
		First(&session).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Chat session not found",
			})
		}
		log.Error("Failed to fetch chat session:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch chat session",
		})
	}

	var req UpdateSessionRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if err := validation.Validate(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"errors": err,
		})
	}

	updates := make(map[string]interface{})
	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	if err := database.Connection().Model(&session).Updates(updates).Error; err != nil {
		log.Error("Failed to update chat session:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update chat session",
		})
	}

	return c.JSON(fiber.Map{
		"session": session,
		"message": "Chat session updated successfully",
	})
}

// DeleteSession deletes a chat session
func DeleteSession(c fiber.Ctx) error {
	sessionID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid session ID",
		})
	}

	// Verify user exists in database
	user, err := utils.VerifyUserFromContext(c)
	if err != nil {
		if err.Error() == "user account is deactivated" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "User account is deactivated",
			})
		}
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	var session entities.ChatSession
	if err := database.Connection().
		Where("id = ? AND user_id = ?", sessionID, user.ID).
		First(&session).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Chat session not found",
			})
		}
		log.Error("Failed to fetch chat session:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch chat session",
		})
	}

	if err := database.Connection().Delete(&session).Error; err != nil {
		log.Error("Failed to delete chat session:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete chat session",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Chat session deleted successfully",
	})
}

// SendMessage sends a message to a chat session with streaming support
func SendMessage(c fiber.Ctx) error {
	sessionID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid session ID",
		})
	}

	// Verify user exists in database
	user, err := utils.VerifyUserFromContext(c)
	if err != nil {
		if err.Error() == "user account is deactivated" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "User account is deactivated",
			})
		}
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	// Verify session ownership and preload chatbot with provider
	var session entities.ChatSession
	if err := database.Connection().
		Where("id = ? AND user_id = ?", sessionID, user.ID).
		Preload("Chatbot").
		Preload("Chatbot.Provider").
		First(&session).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Chat session not found",
			})
		}
		log.Error("Failed to fetch chat session:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch chat session",
		})
	}

	var req SendMessageRequest
	// Check Content-Type
	contentType := c.Get("Content-Type")
	log.Info("Content-Type:", contentType)
	body := c.Body()
	log.Info("Request body:", string(body))
	if err := json.Unmarshal(body, &req); err != nil {
		log.Error("Failed to unmarshal request body:", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if err := validation.Validate(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"errors": err,
		})
	}

	// Get the last user message content
	if len(req.Messages) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No messages provided",
		})
	}

	lastMessage := req.Messages[len(req.Messages)-1]
	if lastMessage.Role != "user" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Last message must be from user",
		})
	}

	content := lastMessage.Content
	if content == "" && len(lastMessage.Parts) > 0 {
		// If content empty, use parts
		for _, part := range lastMessage.Parts {
			if part.Type == "text" {
				content += part.Text
			}
		}
	}

	if content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No content in user message",
		})
	}

	// Save user message
	userMessage := entities.Message{
		SessionID:  uint(sessionID),
		Role:       "user",
		Content:    content,
		TokenCount: len(content) / 4, // Rough estimation
	}

	if err := database.Connection().Create(&userMessage).Error; err != nil {
		log.Error("Failed to save user message:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to save message",
		})
	}

	// Check if streaming is requested
	stream := c.Query("stream") == "true"

	if stream {
		return streamVercelResponse(c, session.Chatbot, content, session)
	}

	// Non-streaming response
	aiResponse, err := generateAIResponse(session.Chatbot, content)
	if err != nil {
		log.Error("Failed to generate AI response:", err)
		aiResponse = "Üzgünüm, şu anda yanıt oluşturamıyorum. Lütfen daha sonra tekrar deneyin."
	}

	aiMessage := entities.Message{
		SessionID:  uint(sessionID),
		Role:       "assistant",
		Content:    aiResponse,
		TokenCount: len(aiResponse) / 4,
	}

	if err := database.Connection().Create(&aiMessage).Error; err != nil {
		log.Error("Failed to save AI message:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to save AI response",
		})
	}

	return c.JSON(fiber.Map{
		"user_message": userMessage,
		"ai_message":   aiMessage,
		"message":      "Message sent successfully",
	})
}

// generateAIResponse generates AI response using the chatbot's provider
func generateAIResponse(chatbot entities.Chatbot, prompt string) (string, error) {
	// Parse provider config
	var providerConfig map[string]interface{}
	if len(chatbot.Provider.Config) > 0 {
		log.Info("Provider config from DB:", chatbot.Provider.Config)
		providerConfig = chatbot.Provider.Config
	} else {
		log.Info("Provider config is empty")
		providerConfig = make(map[string]interface{})
	}

	// Parse chatbot config for model and other settings
	var chatbotConfig map[string]interface{}
	if len(chatbot.Config) > 0 {
		log.Info("Chatbot config from DB:", chatbot.Config)
		chatbotConfig = chatbot.Config
	} else {
		log.Info("Chatbot config is empty")
		chatbotConfig = make(map[string]interface{})
	}

	// Create provider instance using factory
	factory := &providers.ProviderFactory{}
	provider, err := factory.NewProvider(chatbot.Provider.Type, providerConfig)
	if err != nil {
		return "", fmt.Errorf("failed to create provider: %w", err)
	}
	if provider == nil {
		return "", fmt.Errorf("unsupported provider type: %s", chatbot.Provider.Type)
	}

	// Prepare options for generation
	options := make(map[string]interface{})

	// Get model from chatbot config
	if model, ok := chatbotConfig["model"].(string); ok && model != "" {
		options["model"] = model
	}

	// Add system prompt if available
	if chatbot.SystemPrompt != "" {
		// For Ollama, we can include system prompt in the prompt
		if chatbot.Provider.Type == "ollama" {
			prompt = fmt.Sprintf("System: %s\n\nUser: %s", chatbot.SystemPrompt, prompt)
		}
	}

	// Generate response
	ctx := context.Background()
	responseChan, err := provider.Generate(ctx, prompt, options)
	if err != nil {
		return "", fmt.Errorf("failed to generate response: %w", err)
	}

	// Collect response from channel
	var response strings.Builder
	for chunk := range responseChan {
		response.WriteString(chunk)
	}

	return response.String(), nil
}

// convertVercelMessagesToPrompt converts Vercel AI SDK messages to a single prompt
func convertVercelMessagesToPrompt(messages []VercelMessage) string {
	var prompt strings.Builder

	for _, msg := range messages {
		content := msg.Content
		if content == "" && len(msg.Parts) > 0 {
			// If content empty, use parts
			for _, part := range msg.Parts {
				if part.Type == "text" {
					content += part.Text
				}
			}
		}

		switch msg.Role {
		case "system":
			prompt.WriteString(fmt.Sprintf("System: %s\n\n", content))
		case "user":
			prompt.WriteString(fmt.Sprintf("User: %s\n\n", content))
		case "assistant":
			prompt.WriteString(fmt.Sprintf("Assistant: %s\n\n", content))
		}
	}

	prompt.WriteString("Assistant: ")
	return prompt.String()
}

// streamVercelResponse streams response in Vercel AI SDK v4 format
func streamVercelResponse(c fiber.Ctx, chatbot entities.Chatbot, prompt string, session entities.ChatSession) error {
	// Set headers for SSE
	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("Access-Control-Allow-Origin", "*")

	// Parse provider config
	var providerConfig map[string]interface{}
	if len(chatbot.Provider.Config) > 0 {
		log.Info("Provider config from DB:", chatbot.Provider.Config)
		providerConfig = chatbot.Provider.Config
	} else {
		log.Info("Provider config is empty")
		providerConfig = make(map[string]interface{})
	}

	// Parse chatbot config for model and other settings
	var chatbotConfig map[string]interface{}
	if len(chatbot.Config) > 0 {
		log.Info("Chatbot config from DB:", chatbot.Config)
		chatbotConfig = chatbot.Config
	} else {
		log.Info("Chatbot config is empty")
		chatbotConfig = make(map[string]interface{})
	}

	// Create provider instance using factory
	factory := &providers.ProviderFactory{}
	provider, err := factory.NewProvider(chatbot.Provider.Type, providerConfig)
	if err != nil {
		c.Write([]byte("event: error\ndata: " + err.Error() + "\n\n"))
		return nil
	}
	if provider == nil {
		c.Write([]byte("event: error\ndata: Unsupported provider type: " + chatbot.Provider.Type + "\n\n"))
		return nil
	}

	// Prepare options for generation
	options := make(map[string]interface{})

	// Get model from chatbot config, default to gpt-3.5-turbo if not set
	model := "gpt-3.5-turbo"
	if m, ok := chatbotConfig["model"].(string); ok && m != "" {
		model = m
	}
	options["model"] = model

	// Add system prompt if available
	if chatbot.SystemPrompt != "" {
		// For Ollama, we can include system prompt in the prompt
		if chatbot.Provider.Type == "ollama" {
			prompt = fmt.Sprintf("System: %s\n\nUser: %s", chatbot.SystemPrompt, prompt)
		}
	}

	// Generate messageId
	messageId := fmt.Sprintf("msg-%d", session.ID)

	// Send initial message event
	initialData := fiber.Map{
		"messageId": messageId,
	}
	initialJSON, _ := json.Marshal(initialData)
	c.Write([]byte("f:" + string(initialJSON) + "\n"))

	// Generate streaming response
	ctx := context.Background()
	responseChan, err := provider.Generate(ctx, prompt, options)
	if err != nil {
		c.Write([]byte("event: error\ndata: " + err.Error() + "\n\n"))
		return nil
	}

	// Stream response chunks in Vercel AI SDK v4 format
	fullResponse := ""
	for chunk := range responseChan {
		if chunk != "" {
			fullResponse += chunk
			// Send chunk as simple string
			c.Write([]byte("0:\"" + chunk + "\"\n"))
		}
	}

	// Calculate token counts (rough estimation)
	promptTokens := len(prompt) / 4
	completionTokens := len(fullResponse) / 4

	// Send finish event
	finishData := fiber.Map{
		"finishReason": "stop",
		"usage": fiber.Map{
			"promptTokens":     promptTokens,
			"completionTokens": completionTokens,
		},
		"isContinued": false,
	}
	finishJSON, _ := json.Marshal(finishData)
	c.Write([]byte("e:" + string(finishJSON) + "\n"))

	// Send done event
	doneData := fiber.Map{
		"finishReason": "stop",
		"usage": fiber.Map{
			"promptTokens":     promptTokens,
			"completionTokens": completionTokens,
		},
	}
	doneJSON, _ := json.Marshal(doneData)
	c.Write([]byte("d:" + string(doneJSON) + "\n"))

	// Save AI message to database
	aiMessage := entities.Message{
		SessionID:  session.ID,
		Role:       "assistant",
		Content:    fullResponse,
		TokenCount: completionTokens,
	}

	if err := database.Connection().Create(&aiMessage).Error; err != nil {
		log.Error("Failed to save AI message:", err)
	}

	return nil
}

// GetSessionMessages returns messages for a specific session
func GetSessionMessages(c fiber.Ctx) error {
	sessionID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid session ID",
		})
	}

	// Verify user exists in database
	user, err := utils.VerifyUserFromContext(c)
	if err != nil {
		if err.Error() == "user account is deactivated" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "User account is deactivated",
			})
		}
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	// Verify session ownership
	var session entities.ChatSession
	if err := database.Connection().
		Where("id = ? AND user_id = ?", sessionID, user.ID).
		First(&session).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Chat session not found",
			})
		}
		log.Error("Failed to fetch chat session:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch chat session",
		})
	}

	var messages []entities.Message
	if err := database.Connection().
		Where("session_id = ?", sessionID).
		Order("created_at ASC").
		Find(&messages).Error; err != nil {
		log.Error("Failed to fetch messages:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch messages",
		})
	}

	return c.JSON(fiber.Map{
		"messages": messages,
	})
}

// VercelChatRequest represents the request format expected by Vercel AI SDK
type VercelChatRequest struct {
	Messages []VercelMessage `json:"messages" validate:"required,min=1"`
	Model    string          `json:"model,omitempty"`
	Stream   bool            `json:"stream,omitempty"`
}

// VercelMessage represents a message in Vercel AI SDK format
type VercelMessage struct {
	Role    string       `json:"role" validate:"required,oneof=system user assistant"`
	Content string       `json:"content"`
	Parts   []VercelPart `json:"parts,omitempty"`
}

// VercelChatCompletion handles chat completion requests compatible with Vercel AI SDK
func VercelChatCompletion(c fiber.Ctx) error {
	var req VercelChatRequest
	body := c.Body()
	log.Info("VercelChatCompletion request body:", string(body))
	if err := json.Unmarshal(body, &req); err != nil {
		log.Error("Failed to unmarshal VercelChatCompletion request body:", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if err := validation.Validate(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"errors": err,
		})
	}

	// Get current user
	user, err := utils.GetUserFromContext(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// For now, use the first available chatbot of the user
	// In production, you might want to specify which chatbot to use
	var chatbot entities.Chatbot
	if err := database.Connection().
		Where("user_id = ? AND is_active = ?", user.ID, true).
		Preload("Provider").
		First(&chatbot).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "No active chatbot found. Please create a chatbot first.",
			})
		}
		log.Error("Failed to fetch chatbot:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch chatbot",
		})
	}

	// Convert Vercel messages to prompt
	prompt := convertVercelMessagesToPrompt(req.Messages)

	// Create a temporary chat session for this request
	session := entities.ChatSession{
		UserID:    user.ID,
		ChatbotID: chatbot.ID,
		Title:     "Vercel AI SDK Chat",
		IsActive:  false, // Temporary session
	}

	if err := database.Connection().Create(&session).Error; err != nil {
		log.Error("Failed to create temporary session:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create session",
		})
	}

	// Save user messages to database
	for _, msg := range req.Messages {
		if msg.Role == "user" {
			userMessage := entities.Message{
				SessionID:  session.ID,
				Role:       msg.Role,
				Content:    msg.Content,
				TokenCount: len(msg.Content) / 4,
			}
			if err := database.Connection().Create(&userMessage).Error; err != nil {
				log.Error("Failed to save user message:", err)
			}
		}
	}

	// Handle streaming response
	if req.Stream {
		return streamVercelResponse(c, chatbot, prompt, session)
	}

	// Handle non-streaming response
	aiResponse, err := generateAIResponse(chatbot, prompt)
	if err != nil {
		log.Error("Failed to generate AI response:", err)
		aiResponse = "Üzgünüm, şu anda yanıt oluşturamıyorum. Lütfen daha sonra tekrar deneyin."
	}

	// Save AI response
	aiMessage := entities.Message{
		SessionID:  session.ID,
		Role:       "assistant",
		Content:    aiResponse,
		TokenCount: len(aiResponse) / 4,
	}

	if err := database.Connection().Create(&aiMessage).Error; err != nil {
		log.Error("Failed to save AI message:", err)
	}

	return c.JSON(fiber.Map{
		"id":      fmt.Sprintf("chatcmpl-%d", session.ID),
		"object":  "chat.completion",
		"created": session.CreatedAt.Unix(),
		"model":   req.Model,
		"choices": []fiber.Map{
			{
				"index": 0,
				"message": fiber.Map{
					"role":    "assistant",
					"content": aiResponse,
				},
				"finish_reason": "stop",
			},
		},
		"usage": fiber.Map{
			"prompt_tokens":     len(prompt) / 4,
			"completion_tokens": len(aiResponse) / 4,
			"total_tokens":      (len(prompt) + len(aiResponse)) / 4,
		},
	})
}
