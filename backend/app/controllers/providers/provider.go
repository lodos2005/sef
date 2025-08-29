package providers

import (
	"sef/app/entities"
	"sef/internal/database"
	"sef/internal/validation"
	"strconv"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"gorm.io/gorm"
)

type CreateProviderRequest struct {
	Name        string `json:"name" validate:"required,min=2,max=100"`
	Type        string `json:"type" validate:"required,oneof=ollama openai anthropic"`
	Description string `json:"description" validate:"max=500"`
	Config      string `json:"config" validate:"required,json"`
}

type UpdateProviderRequest struct {
	Name        *string `json:"name,omitempty" validate:"omitempty,min=2,max=100"`
	Description *string `json:"description,omitempty" validate:"omitempty,max=500"`
	IsActive    *bool   `json:"is_active,omitempty"`
	Config      *string `json:"config,omitempty" validate:"omitempty,json"`
}

// Index returns all providers
func Index(c fiber.Ctx) error {
	var providers []entities.Provider
	if err := database.Connection().Find(&providers).Error; err != nil {
		log.Error("Failed to fetch providers:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch providers",
		})
	}

	return c.JSON(fiber.Map{
		"providers": providers,
	})
}

// Show returns a specific provider
func Show(c fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid provider ID",
		})
	}

	var provider entities.Provider
	if err := database.Connection().First(&provider, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Provider not found",
			})
		}
		log.Error("Failed to fetch provider:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch provider",
		})
	}

	return c.JSON(fiber.Map{
		"provider": provider,
	})
}

// Create creates a new provider
func Create(c fiber.Ctx) error {
	var req CreateProviderRequest
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

	provider := entities.Provider{
		Name:        req.Name,
		Type:        req.Type,
		Description: req.Description,
		Config:      req.Config,
		IsActive:    true,
	}

	if err := database.Connection().Create(&provider).Error; err != nil {
		log.Error("Failed to create provider:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create provider",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"provider": provider,
		"message":  "Provider created successfully",
	})
}

// Update updates a provider
func Update(c fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid provider ID",
		})
	}

	var provider entities.Provider
	if err := database.Connection().First(&provider, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Provider not found",
			})
		}
		log.Error("Failed to fetch provider:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch provider",
		})
	}

	var req UpdateProviderRequest
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
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if req.Config != nil {
		updates["config"] = *req.Config
	}

	if err := database.Connection().Model(&provider).Updates(updates).Error; err != nil {
		log.Error("Failed to update provider:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update provider",
		})
	}

	return c.JSON(fiber.Map{
		"provider": provider,
		"message":  "Provider updated successfully",
	})
}

// Delete deletes a provider
func Delete(c fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid provider ID",
		})
	}

	var provider entities.Provider
	if err := database.Connection().First(&provider, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Provider not found",
			})
		}
		log.Error("Failed to fetch provider:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch provider",
		})
	}

	if err := database.Connection().Delete(&provider).Error; err != nil {
		log.Error("Failed to delete provider:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete provider",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Provider deleted successfully",
	})
}

// GetModels returns available models for a provider
func GetModels(c fiber.Ctx) error {
	providerType := c.Params("type")

	// This would integrate with actual LLM providers
	// For now, return mock data based on provider type
	var models []string

	switch providerType {
	case "ollama":
		models = []string{"llama2", "mistral", "codellama", "vicuna"}
	case "openai":
		models = []string{"gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"}
	case "anthropic":
		models = []string{"claude-3-haiku", "claude-3-sonnet", "claude-3-opus"}
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Unsupported provider type",
		})
	}

	return c.JSON(fiber.Map{
		"models": models,
	})
}
