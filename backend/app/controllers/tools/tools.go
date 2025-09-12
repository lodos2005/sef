package tools

import (
	"sef/app/entities"
	"sef/internal/paginator"
	"sef/internal/search"
	"sef/pkg/toolrunners"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Controller struct {
	DB *gorm.DB
}

func (h *Controller) Index(c fiber.Ctx) error {
	var items []*entities.Tool
	db := h.DB.Model(&entities.Tool{}).Preload(clause.Associations)

	if c.Query("search") != "" {
		search.Search(c.Query("search"), db)
	}

	page, err := paginator.New(db, c).Paginate(&items)
	if err != nil {
		return err
	}

	return c.JSON(page)
}

func (h *Controller) Show(c fiber.Ctx) error {
	var item *entities.Tool
	if err := h.DB.Preload(clause.Associations).First(&item, c.Params("id")).Error; err != nil {
		return err
	}

	return c.JSON(item)
}

func (h *Controller) Create(c fiber.Ctx) error {
	var payload *entities.Tool
	if err := c.Bind().JSON(&payload); err != nil {
		return err
	}

	// Validate tool type
	if payload.Type == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "tool type is required"})
	}

	// Validate tool runner exists
	factory := &toolrunners.ToolRunnerFactory{}
	if _, err := factory.NewToolRunner(payload.Type, payload.Config); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if err := h.DB.
		Clauses(clause.Returning{}).
		Create(&payload).Error; err != nil {
		return err
	}

	return c.JSON(payload)
}

func (h *Controller) Update(c fiber.Ctx) error {
	var payload *entities.Tool
	if err := c.Bind().JSON(&payload); err != nil {
		return err
	}

	var tool *entities.Tool
	if err := h.DB.First(&tool, c.Params("id")).Error; err != nil {
		return err
	}

	// Validate tool type if it's being updated
	if payload.Type != "" {
		factory := &toolrunners.ToolRunnerFactory{}
		if _, err := factory.NewToolRunner(payload.Type, payload.Config); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
	}

	if err := h.DB.
		Clauses(clause.Returning{}).
		Model(&entities.Tool{}).
		Where("id = ?", c.Params("id")).
		Updates(&payload).Error; err != nil {
		return err
	}

	return c.JSON(payload)
}

func (h *Controller) Delete(c fiber.Ctx) error {
	if err := h.DB.Delete(&entities.Tool{}, c.Params("id")).Error; err != nil {
		return err
	}

	return c.JSON(fiber.Map{"message": "Tool deleted successfully"})
}

func (h *Controller) Types(c fiber.Ctx) error {
	// For now, hardcoded list of supported tool types
	// In the future, this could be dynamic based on available tool runners
	factory := &toolrunners.ToolRunnerFactory{}
	return c.JSON(fiber.Map{"types": factory.SupportedTypes()})
}

func (h *Controller) Schema(c fiber.Ctx) error {
	toolType := c.Query("type")
	if toolType == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "type query parameter is required"})
	}

	// Create tool runner to get schema
	factory := &toolrunners.ToolRunnerFactory{}
	runner, err := factory.NewToolRunner(toolType, map[string]interface{}{})
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	schema := runner.GetParameterSchema()
	return c.JSON(fiber.Map{"schema": schema})
}
