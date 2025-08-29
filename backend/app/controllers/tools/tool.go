package tools

import (
	"sef/app/entities"
	"sef/internal/database"
	"sef/internal/validation"
	"strconv"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
)

type CreateToolRequest struct {
	Name        string `json:"name" validate:"required,min=2,max=255"`
	Description string `json:"description" validate:"max=1000"`
	Type        string `json:"type" validate:"required,oneof=builtin custom_script api_call"`
	Script      string `json:"script" validate:"max=10000"`
	Config      string `json:"config" validate:"json"`
}

type UpdateToolRequest struct {
	Name        *string `json:"name,omitempty" validate:"omitempty,min=2,max=255"`
	Description *string `json:"description,omitempty" validate:"omitempty,max=1000"`
	Type        *string `json:"type,omitempty" validate:"omitempty,oneof=builtin custom_script api_call"`
	Script      *string `json:"script,omitempty" validate:"omitempty,max=10000"`
	Config      *string `json:"config,omitempty" validate:"omitempty,json"`
	IsActive    *bool   `json:"is_active,omitempty"`
}

// Index returns all tools
func Index(c fiber.Ctx) error {
	var tools []entities.Tool
	if err := database.Connection().Where("is_active = ?", true).Order("created_at DESC").Find(&tools).Error; err != nil {
		log.Error("Failed to fetch tools:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch tools",
		})
	}

	return c.JSON(fiber.Map{
		"tools": tools,
	})
}

// Show returns a specific tool
func Show(c fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid tool ID",
		})
	}

	var tool entities.Tool
	if err := database.Connection().Where("id = ? AND is_active = ?", id, true).First(&tool).Error; err != nil {
		if err.Error() == "record not found" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Tool not found",
			})
		}
		log.Error("Failed to fetch tool:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch tool",
		})
	}

	return c.JSON(fiber.Map{
		"tool": tool,
	})
}

// Create creates a new tool
func Create(c fiber.Ctx) error {
	var req CreateToolRequest
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

	tool := entities.Tool{
		Name:        req.Name,
		Description: req.Description,
		Type:        req.Type,
		Script:      req.Script,
		Config:      req.Config,
		IsActive:    true,
	}

	if err := database.Connection().Create(&tool).Error; err != nil {
		log.Error("Failed to create tool:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create tool",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"tool":    tool,
		"message": "Tool created successfully",
	})
}

// Update updates a tool
func Update(c fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid tool ID",
		})
	}

	var tool entities.Tool
	if err := database.Connection().Where("id = ?", id).First(&tool).Error; err != nil {
		if err.Error() == "record not found" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Tool not found",
			})
		}
		log.Error("Failed to fetch tool:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch tool",
		})
	}

	var req UpdateToolRequest
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

	// Update fields
	if req.Name != nil {
		tool.Name = *req.Name
	}
	if req.Description != nil {
		tool.Description = *req.Description
	}
	if req.Type != nil {
		tool.Type = *req.Type
	}
	if req.Script != nil {
		tool.Script = *req.Script
	}
	if req.Config != nil {
		tool.Config = *req.Config
	}
	if req.IsActive != nil {
		tool.IsActive = *req.IsActive
	}

	if err := database.Connection().Save(&tool).Error; err != nil {
		log.Error("Failed to update tool:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update tool",
		})
	}

	return c.JSON(fiber.Map{
		"tool":    tool,
		"message": "Tool updated successfully",
	})
}

// Delete deletes a tool
func Delete(c fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid tool ID",
		})
	}

	var tool entities.Tool
	if err := database.Connection().Where("id = ?", id).First(&tool).Error; err != nil {
		if err.Error() == "record not found" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Tool not found",
			})
		}
		log.Error("Failed to fetch tool:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch tool",
		})
	}

	if err := database.Connection().Delete(&tool).Error; err != nil {
		log.Error("Failed to delete tool:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete tool",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Tool deleted successfully",
	})
}
