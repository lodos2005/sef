package chatbots

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
	var items []*entities.Chatbot
	db := h.DB.Model(&entities.Chatbot{}).Preload(clause.Associations)

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
	var item *entities.Chatbot
	if err := h.DB.Preload(clause.Associations).First(&item, c.Params("id")).Error; err != nil {
		return err
	}

	return c.JSON(item)
}

func (h *Controller) Create(c fiber.Ctx) error {
	var payload *entities.Chatbot
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
	var payload *entities.Chatbot
	if err := c.Bind().JSON(&payload); err != nil {
		return err
	}

	var chatbot *entities.Chatbot
	if err := h.DB.First(&chatbot, c.Params("id")).Error; err != nil {
		return err
	}

	if err := h.DB.
		Clauses(clause.Returning{}).
		Model(&entities.Chatbot{}).
		Where("id = ?", c.Params("id")).
		Updates(&payload).Error; err != nil {
		return err
	}

	return c.JSON(payload)
}

func (h *Controller) Delete(c fiber.Ctx) error {
	if err := h.DB.Delete(&entities.Chatbot{}, c.Params("id")).Error; err != nil {
		return err
	}

	return c.JSON(fiber.Map{"message": "Chatbot deleted successfully"})
}
