package chats

import (
	"sef/app/entities"
	"sef/internal/database"
	"sef/internal/paginator"
	"sef/internal/search"
	"sef/internal/validation"
	"sef/utils"
	"strconv"

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

type SendMessageRequest struct {
	Content string `json:"content" validate:"required,min=1"`
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
		return err
	}

	if err := database.Connection().Create(&payload).Error; err != nil {
		return err
	}

	return c.JSON(payload)
}

// UpdateSessionAdmin updates a chat session for admin
func UpdateSessionAdmin(c fiber.Ctx) error {
	var item *entities.ChatSession
	if err := database.Connection().First(&item, c.Params("id")).Error; err != nil {
		return err
	}

	if err := c.Bind().JSON(&item); err != nil {
		return err
	}

	if err := database.Connection().Save(&item).Error; err != nil {
		return err
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
	userID := utils.GetClaimFromContext(c).ID

	var sessions []entities.ChatSession
	if err := database.Connection().
		Where("user_id = ?", userID).
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

	userID := utils.GetClaimFromContext(c).ID

	var session entities.ChatSession
	if err := database.Connection().
		Where("id = ? AND user_id = ?", sessionID, userID).
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

	userID := utils.GetClaimFromContext(c).ID

	// Verify chatbot exists and user has access
	var chatbot entities.Chatbot
	if err := database.Connection().
		Where("id = ? AND (is_public = ? OR user_id = ?)", req.ChatbotID, true, userID).
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
		UserID:    userID,
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

	userID := utils.GetClaimFromContext(c).ID

	var session entities.ChatSession
	if err := database.Connection().
		Where("id = ? AND user_id = ?", sessionID, userID).
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

	userID := utils.GetClaimFromContext(c).ID

	var session entities.ChatSession
	if err := database.Connection().
		Where("id = ? AND user_id = ?", sessionID, userID).
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

// SendMessage sends a message to a chat session (simplified version)
func SendMessage(c fiber.Ctx) error {
	sessionID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid session ID",
		})
	}

	userID := utils.GetClaimFromContext(c).ID

	// Verify session ownership
	var session entities.ChatSession
	if err := database.Connection().
		Where("id = ? AND user_id = ?", sessionID, userID).
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

	// Save user message
	userMessage := entities.Message{
		SessionID:  uint(sessionID),
		Role:       "user",
		Content:    req.Content,
		TokenCount: len(req.Content) / 4, // Rough estimation
	}

	if err := database.Connection().Create(&userMessage).Error; err != nil {
		log.Error("Failed to save user message:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to save message",
		})
	}

	// Generate AI response (mock for now)
	aiResponse := "Bu bir test yanıtıdır. Gerçek AI entegrasyonu henüz implement edilmemiştir."

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

// GetSessionMessages returns messages for a specific session
func GetSessionMessages(c fiber.Ctx) error {
	sessionID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid session ID",
		})
	}

	userID := utils.GetClaimFromContext(c).ID

	// Verify session ownership
	var session entities.ChatSession
	if err := database.Connection().
		Where("id = ? AND user_id = ?", sessionID, userID).
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
