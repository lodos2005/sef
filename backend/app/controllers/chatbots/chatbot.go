package chatbots

import (
	"encoding/json"
	"sef/app/entities"
	"sef/internal/database"
	"sef/internal/validation"
	"sef/utils"
	"strconv"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"gorm.io/gorm"
)

type CreateChatbotRequest struct {
	Name         string          `json:"name" validate:"required,min=2,max=255"`
	Description  string          `json:"description" validate:"max=1000"`
	ProviderID   uint            `json:"provider_id" validate:"required"`
	IsPublic     bool            `json:"is_public"`
	SystemPrompt string          `json:"system_prompt" validate:"max=5000"`
	Config       json.RawMessage `json:"config"`
	ToolIDs      []uint          `json:"tool_ids,omitempty"`
}

type UpdateChatbotRequest struct {
	Name         *string          `json:"name,omitempty" validate:"omitempty,min=2,max=255"`
	Description  *string          `json:"description,omitempty" validate:"omitempty,max=1000"`
	IsActive     *bool            `json:"is_active,omitempty"`
	IsPublic     *bool            `json:"is_public,omitempty"`
	SystemPrompt *string          `json:"system_prompt,omitempty" validate:"omitempty,max=5000"`
	Config       *json.RawMessage `json:"config,omitempty"`
	ToolIDs      []uint           `json:"tool_ids,omitempty"`
}

// Index returns all chatbots accessible to the user
func Index(c fiber.Ctx) error {
	user, err := utils.GetUserFromContext(c)
	if err != nil {
		log.Error("Failed to get user from context:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to authenticate user",
		})
	}

	var chatbots []entities.Chatbot
	query := database.Connection().Preload("Provider").Preload("Tools").Preload("User")

	if user.SuperAdmin != nil && *user.SuperAdmin {
		// Super admin can see all chatbots
	} else {
		// Regular users can see public chatbots and their own
		query = query.Where("is_public = ? OR user_id = ?", true, user.ID)
	}

	if err := query.Order("created_at DESC").Find(&chatbots).Error; err != nil {
		log.Error("Failed to fetch chatbots:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch chatbots",
		})
	}

	return c.JSON(fiber.Map{
		"chatbots": chatbots,
	})
}

// Show returns a specific chatbot
func Show(c fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid chatbot ID",
		})
	}

	user, err := utils.GetUserFromContext(c)
	if err != nil {
		log.Error("Failed to get user from context:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to authenticate user",
		})
	}

	var chatbot entities.Chatbot
	query := database.Connection().
		Preload("Provider").
		Preload("Tools").
		Preload("User").
		Where("id = ?", id)

	if user.SuperAdmin == nil || !*user.SuperAdmin {
		query = query.Where("is_public = ? OR user_id = ?", true, user.ID)
	}

	if err := query.First(&chatbot).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Chatbot not found",
			})
		}
		log.Error("Failed to fetch chatbot:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch chatbot",
		})
	}

	return c.JSON(fiber.Map{
		"chatbot": chatbot,
	})
}

// Create creates a new chatbot
func Create(c fiber.Ctx) error {
	var req CreateChatbotRequest
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

	// Validate config JSON if provided
	if len(req.Config) > 0 && !json.Valid(req.Config) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid JSON in config field",
		})
	}

	user, err := utils.GetUserFromContext(c)
	if err != nil {
		log.Error("Failed to get user from context:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to authenticate user",
		})
	}

	// Verify provider exists
	var provider entities.Provider
	if err := database.Connection().Where("id = ? AND is_active = ?", req.ProviderID, true).First(&provider).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Provider not found or inactive",
			})
		}
		log.Error("Failed to verify provider:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to verify provider",
		})
	}

	// Verify tools exist if provided
	var tools []entities.Tool
	if len(req.ToolIDs) > 0 {
		if err := database.Connection().Where("id IN ? AND is_active = ?", req.ToolIDs, true).Find(&tools).Error; err != nil {
			log.Error("Failed to verify tools:", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to verify tools",
			})
		}
		if len(tools) != len(req.ToolIDs) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Some tools not found or inactive",
			})
		}
	}

	chatbot := entities.Chatbot{
		Name:         req.Name,
		Description:  req.Description,
		ProviderID:   req.ProviderID,
		UserID:       user.ID,
		IsActive:     true,
		IsPublic:     req.IsPublic,
		SystemPrompt: req.SystemPrompt,
		Config:       string(req.Config),
		Tools:        tools,
	}

	if err := database.Connection().Create(&chatbot).Error; err != nil {
		log.Error("Failed to create chatbot:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create chatbot",
		})
	}

	// Reload with associations
	if err := database.Connection().
		Preload("Provider").
		Preload("Tools").
		Preload("User").
		First(&chatbot, chatbot.ID).Error; err != nil {
		log.Error("Failed to reload chatbot:", err)
	}

	return c.Status(fiber.StatusCreated).JSON(chatbot)
}

// Update updates a chatbot
func Update(c fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid chatbot ID",
		})
	}

	user, err := utils.GetUserFromContext(c)
	if err != nil {
		log.Error("Failed to get user from context:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to authenticate user",
		})
	}

	var chatbot entities.Chatbot
	query := database.Connection().Where("id = ?", id)

	if user.SuperAdmin == nil || !*user.SuperAdmin {
		query = query.Where("user_id = ?", user.ID)
	}

	if err := query.First(&chatbot).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Chatbot not found",
			})
		}
		log.Error("Failed to fetch chatbot:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch chatbot",
		})
	}

	var req UpdateChatbotRequest
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

	// Validate config JSON if provided
	if req.Config != nil && len(*req.Config) > 0 && !json.Valid(*req.Config) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid JSON in config field",
		})
	}

	// Update fields
	if req.Name != nil {
		chatbot.Name = *req.Name
	}
	if req.Description != nil {
		chatbot.Description = *req.Description
	}
	if req.IsActive != nil {
		chatbot.IsActive = *req.IsActive
	}
	if req.IsPublic != nil {
		chatbot.IsPublic = *req.IsPublic
	}
	if req.SystemPrompt != nil {
		chatbot.SystemPrompt = *req.SystemPrompt
	}
	if req.Config != nil {
		chatbot.Config = string(*req.Config)
	}

	// Update tools if provided
	if req.ToolIDs != nil {
		var tools []entities.Tool
		if len(req.ToolIDs) > 0 {
			if err := database.Connection().Where("id IN ? AND is_active = ?", req.ToolIDs, true).Find(&tools).Error; err != nil {
				log.Error("Failed to verify tools:", err)
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "Failed to verify tools",
				})
			}
			if len(tools) != len(req.ToolIDs) {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "Some tools not found or inactive",
				})
			}
		}
		chatbot.Tools = tools
	}

	if err := database.Connection().Save(&chatbot).Error; err != nil {
		log.Error("Failed to update chatbot:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update chatbot",
		})
	}

	// Reload with associations
	if err := database.Connection().
		Preload("Provider").
		Preload("Tools").
		Preload("User").
		First(&chatbot, chatbot.ID).Error; err != nil {
		log.Error("Failed to reload chatbot:", err)
	}

	return c.JSON(fiber.Map{
		"chatbot": chatbot,
		"message": "Chatbot updated successfully",
	})
}

// Delete deletes a chatbot
func Delete(c fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid chatbot ID",
		})
	}

	user, err := utils.GetUserFromContext(c)
	if err != nil {
		log.Error("Failed to get user from context:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to authenticate user",
		})
	}

	var chatbot entities.Chatbot
	query := database.Connection().Where("id = ?", id)

	if user.SuperAdmin == nil || !*user.SuperAdmin {
		query = query.Where("user_id = ?", user.ID)
	}

	if err := query.First(&chatbot).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Chatbot not found",
			})
		}
		log.Error("Failed to fetch chatbot:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch chatbot",
		})
	}

	if err := database.Connection().Delete(&chatbot).Error; err != nil {
		log.Error("Failed to delete chatbot:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete chatbot",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Chatbot deleted successfully",
	})
}
