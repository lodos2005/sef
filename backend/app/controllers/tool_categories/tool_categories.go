package tool_categories

import (
	"sef/app/entities"
	"sef/internal/paginator"
	"sef/internal/search"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Controller struct {
	DB *gorm.DB
}

func (h *Controller) Index(c fiber.Ctx) error {
	var items []*entities.ToolCategory
	db := h.DB.Model(&entities.ToolCategory{}).Preload("Tools")

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
	var item *entities.ToolCategory
	if err := h.DB.Preload("Tools").First(&item, c.Params("id")).Error; err != nil {
		return err
	}

	return c.JSON(item)
}

func (h *Controller) Create(c fiber.Ctx) error {
	var payload *entities.ToolCategory
	if err := c.Bind().JSON(&payload); err != nil {
		return err
	}

	if err := h.DB.
		Clauses(clause.Returning{}).
		Create(&payload).Error; err != nil {
		return err
	}

	return c.JSON(payload)
}

func (h *Controller) Update(c fiber.Ctx) error {
	var payload *entities.ToolCategory
	if err := c.Bind().JSON(&payload); err != nil {
		return err
	}

	var category *entities.ToolCategory
	if err := h.DB.First(&category, c.Params("id")).Error; err != nil {
		return err
	}

	if err := h.DB.
		Clauses(clause.Returning{}).
		Model(&entities.ToolCategory{}).
		Where("id = ?", c.Params("id")).
		Updates(&payload).Error; err != nil {
		return err
	}

	return c.JSON(payload)
}

func (h *Controller) Delete(c fiber.Ctx) error {
	// Break relationship with tools by setting category_id to NULL
	if err := h.DB.Model(&entities.Tool{}).Where("category_id = ?", c.Params("id")).Update("category_id", nil).Error; err != nil {
		return err
	}

	if err := h.DB.Delete(&entities.ToolCategory{}, c.Params("id")).Error; err != nil {
		return err
	}

	return c.JSON(fiber.Map{"message": "Tool category deleted successfully"})
}
