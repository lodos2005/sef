package middleware

import (
	"sef/app/entities"

	"github.com/gofiber/fiber/v3"
)

func IsSuperAdmin() fiber.Handler {
	return func(c fiber.Ctx) error {
		user := c.Locals("user").(*entities.User)
		if user == nil {
			return fiber.NewError(fiber.StatusUnauthorized, "user not authenticated")
		}

		if !user.IsAdmin {
			return fiber.NewError(fiber.StatusForbidden, "insufficient permissions")
		}

		return c.Next()
	}
}
