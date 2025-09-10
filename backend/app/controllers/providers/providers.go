package providers

import (
	"sef/app/entities"
	"sef/internal/paginator"
	"sef/internal/search"
	"sef/pkg/providers"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Controller struct {
	DB *gorm.DB
}

func (h *Controller) Index(c fiber.Ctx) error {
	var items []*entities.Provider
	db := h.DB.Model(&entities.Provider{})

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
	var item *entities.Provider
	if err := h.DB.First(&item, c.Params("id")).Error; err != nil {
		return err
	}

	return c.JSON(item)
}

func (h *Controller) Create(c fiber.Ctx) error {
	var payload *entities.Provider
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
	var payload *entities.Provider
	if err := c.Bind().JSON(&payload); err != nil {
		return err
	}

	var provider *entities.Provider
	if err := h.DB.First(&provider, c.Params("id")).Error; err != nil {
		return err
	}

	if err := h.DB.
		Clauses(clause.Returning{}).
		Model(&entities.Provider{}).
		Where("id = ?", c.Params("id")).
		Updates(&payload).Error; err != nil {
		return err
	}

	return c.JSON(payload)
}

func (h *Controller) Delete(c fiber.Ctx) error {
	if err := h.DB.Delete(&entities.Provider{}, c.Params("id")).Error; err != nil {
		return err
	}

	return c.JSON(fiber.Map{"message": "Provider deleted successfully"})
}

func (h *Controller) Types(c fiber.Ctx) error {
	// For now, hardcoded list of supported provider types
	// In the future, this could be dynamic based on available providers
	types := []string{"ollama", "openai"}
	return c.JSON(fiber.Map{"types": types})
}

func (h *Controller) Models(c fiber.Ctx) error {
	var provider *entities.Provider
	if err := h.DB.First(&provider, c.Params("id")).Error; err != nil {
		return err
	}

	factory := &providers.ProviderFactory{}
	config := map[string]interface{}{
		"base_url": provider.BaseURL,
	}

	llmProvider, err := factory.NewProvider(provider.Type, config)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	models, err := llmProvider.ListModels()
	if err != nil {
		log.Error("Failed to list models: ", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to list models"})
	}

	return c.JSON(fiber.Map{"models": models})
}
