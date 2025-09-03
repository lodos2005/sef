package chats

import (
	"context"
	"encoding/json"
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

type CreateSessionRequest struct {
	Title     string `json:"title" validate:"required,min=1,max=255"`
	ChatbotID uint   `json:"chatbot_id" validate:"required"`
}

type UpdateSessionRequest struct {
	Title    *string `json:"title,omitempty" validate:"omitempty,min=1,max=255"`
	IsActive *bool   `json:"is_active,omitempty"`
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

	// Parse request body
	var req struct {
		Content string `json:"content" validate:"required,min=1"`
	}
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

	// Verify session ownership and get session with chatbot
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

	// Save user message
	userMessage := entities.Message{
		SessionID: uint(sessionID),
		Role:      "user",
		Content:   req.Content,
	}
	if err := database.Connection().Create(&userMessage).Error; err != nil {
		log.Error("Failed to save user message:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to save message",
		})
	}

	// Create provider instance
	factory := &providers.ProviderFactory{}
	provider, err := factory.NewProvider(session.Chatbot.Provider.Type, session.Chatbot.Provider.Config)
	if err != nil {
		log.Error("Failed to create provider:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialize provider",
		})
	}

	// Get chat history for context
	var messages []entities.Message
	if err := database.Connection().
		Where("session_id = ?", sessionID).
		Order("created_at ASC").
		Find(&messages).Error; err != nil {
		log.Error("Failed to fetch chat history:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch chat history",
		})
	}

	// Build conversation context
	var conversationContext string
	if session.Chatbot.SystemPrompt != "" {
		conversationContext = session.Chatbot.SystemPrompt + "\n\n"
	}

	for _, msg := range messages {
		if msg.Role == "user" {
			conversationContext += "User: " + msg.Content + "\n"
		} else if msg.Role == "assistant" {
			conversationContext += "Assistant: " + msg.Content + "\n"
		}
	}
	conversationContext += "User: " + req.Content + "\nAssistant:"

	// Set headers for streaming response
	c.Set("Content-Type", "text/plain")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")

	// Create assistant message record
	assistantMessage := entities.Message{
		SessionID: uint(sessionID),
		Role:      "assistant",
		Content:   "",
	}
	if err := database.Connection().Create(&assistantMessage).Error; err != nil {
		log.Error("Failed to create assistant message:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create message record",
		})
	}

	// Generate streaming response
	options := map[string]interface{}{
		"model": session.Chatbot.Config["model"], // Use model from chatbot config
	}

	stream, err := provider.Generate(context.Background(), conversationContext, options)
	if err != nil {
		log.Error("Failed to generate response:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate response",
		})
	}

	var fullResponse strings.Builder

	// Stream the response
	for chunk := range stream {
		if chunk == "" {
			continue
		}

		// Write chunk to response
		if _, err := c.Write([]byte(chunk)); err != nil {
			log.Error("Failed to write chunk:", err)
			break
		}

		fullResponse.WriteString(chunk)
	}

	// Update the assistant message with full content
	assistantMessage.Content = fullResponse.String()
	if err := database.Connection().Save(&assistantMessage).Error; err != nil {
		log.Error("Failed to update assistant message:", err)
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
