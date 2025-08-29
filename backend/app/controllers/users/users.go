package users

import (
	"sef/app/entities"
	"sef/internal/database"
	"sef/internal/paginator"
	"sef/internal/search"
	"sef/internal/validation"
	"sef/utils"
	"time"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm/clause"
)

type LoginRequest struct {
	Username string `json:"username" validate:"required"`
	Password string `json:"password" validate:"required"`
}

func Login(c fiber.Ctx) error {
	var payload *LoginRequest
	if err := c.Bind().JSON(&payload); err != nil {
		return err
	}

	if err := validation.Validate(payload); err != nil {
		return err
	}

	user, err := utils.GetByUsername(payload.Username)
	if err != nil {
		return utils.NewAuthError()
	}

	if !utils.CheckPasswordHash(payload.Password, user.Password) {
		return utils.NewAuthError()
	}

	t, err := utils.CreateToken(user.Username, user.ID)
	if err != nil {
		return err
	}

	// Add Http-Only cookie to response
	c.Cookie(&fiber.Cookie{
		Name:     "token",
		Value:    t,
		HTTPOnly: true,
		Expires:  time.Now().Add(4 * time.Hour), // 4 hours
	})

	return c.JSON(fiber.Map{"token": t})
}

func Logout(c fiber.Ctx) error {
	// Clear the HTTP-only cookie by setting an expired cookie
	c.Cookie(&fiber.Cookie{
		Name:     "token",
		Value:    "",
		HTTPOnly: true,
		Expires:  time.Now().Add(-time.Hour), // Expired
	})

	return c.JSON(fiber.Map{"message": "Logged out successfully"})
}

func CurrentUser(c fiber.Ctx) error {
	return c.JSON(c.Locals("user").(*entities.User))
}

func Index(c fiber.Ctx) error {
	var items []*entities.User
	db := database.Connection().Model(&entities.User{}).Omit("password")

	if c.Query("search") != "" {
		search.Search(c.Query("search"), db)
	}

	page, err := paginator.New(db, c).Paginate(&items)
	if err != nil {
		return err
	}

	return c.JSON(page)
}

func Show(c fiber.Ctx) error {
	var item *entities.User
	if err := database.Connection().Omit("password").Preload("AccessibleCategories").First(&item, c.Params("id")).Error; err != nil {
		return err
	}

	return c.JSON(item)
}

func Create(c fiber.Ctx) error {
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
	if err := database.Connection().Clauses(clause.Returning{}).Create(&payload).Error; err != nil {
		return err
	}

	return c.JSON(payload)
}

func Update(c fiber.Ctx) error {
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
	if err := database.Connection().First(&user, c.Params("id")).Error; err != nil {
		return err
	}

	if err := database.Connection().Model(&entities.User{}).Where("id = ?", c.Params("id")).Updates(&payload).Error; err != nil {
		return err
	}

	return c.JSON(payload)
}

func Delete(c fiber.Ctx) error {
	if err := database.Connection().Delete(&entities.User{}, c.Params("id")).Error; err != nil {
		return err
	}

	return c.JSON(fiber.Map{"message": "User deleted successfully"})
}
