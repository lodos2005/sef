package users

import (
	"sef/app/entities"
	"sef/internal/paginator"
	"sef/internal/search"
	"sef/utils"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Controller struct {
	DB *gorm.DB
}

func (h *Controller) Index(c fiber.Ctx) error {
	var items []*entities.User
	db := h.DB.Model(&entities.User{})

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
	var item *entities.User
	if err := h.DB.First(&item, c.Params("id")).Error; err != nil {
		return err
	}

	return c.JSON(item)
}

func (h *Controller) Create(c fiber.Ctx) error {
	var payload *entities.User
	if err := c.Bind().JSON(&payload); err != nil {
		return err
	}

	// Hash user password
	hashed, err := utils.CreateHash(payload.Password)
	if err != nil {
		return err
	}

	payload.Password = hashed
	if err := h.DB.
		Clauses(clause.Returning{}).
		Create(&payload).Error; err != nil {
		return err
	}

	return c.JSON(payload)
}

func (h *Controller) Update(c fiber.Ctx) error {
	var payload *entities.User
	if err := c.Bind().JSON(&payload); err != nil {
		return err
	}

	// Check password is provided
	if payload.Password != "" {
		hash, err := utils.CreateHash(payload.Password)
		if err != nil {
			return err
		}
		payload.Password = hash
	}

	var user *entities.User
	if err := h.DB.First(&user, c.Params("id")).Error; err != nil {
		return err
	}

	if err := h.DB.
		Clauses(clause.Returning{}).
		Model(&entities.User{}).
		Where("id = ?", c.Params("id")).
		Updates(&payload).Error; err != nil {
		return err
	}

	return c.JSON(payload)
}

func (h *Controller) Delete(c fiber.Ctx) error {
	if err := h.DB.Delete(&entities.User{}, c.Params("id")).Error; err != nil {
		return err
	}

	return c.JSON(fiber.Map{"message": "User deleted successfully"})
}
