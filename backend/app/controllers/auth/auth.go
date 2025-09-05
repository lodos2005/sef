package auth

import (
	"sef/app/entities"
	"sef/internal/validation"
	"sef/utils"
	"time"

	"github.com/gofiber/fiber/v3"
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

func CurrentUser(c fiber.Ctx) error {
	return c.JSON(c.Locals("user").(*entities.User))
}

func Logout(c fiber.Ctx) error {
	// Invalidate the token cookie by setting its expiration time to the past
	c.Cookie(&fiber.Cookie{
		Name:     "token",
		Value:    "",
		HTTPOnly: true,
		Expires:  time.Now().Add(-100 * time.Hour), // Set to past time
	})

	return c.JSON(fiber.Map{"message": "Logged out successfully"})
}
