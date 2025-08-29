package routes

import (
	"sef/app/controllers/users"

	"github.com/gofiber/fiber/v3"
)

func Server(app *fiber.App) {
	apiV1 := app.Group("/api/v1")

	userGroup := apiV1.Group("/users")
	{
		userGroup.Get("/me", users.CurrentUser)
		userGroup.Get("/", users.Index)
		userGroup.Post("/", users.Create)
		userGroup.Get("/:id", users.Show)
		userGroup.Patch("/:id", users.Update)
		userGroup.Delete("/:id", users.Delete)
	}

	apiV1.Post("/logout", users.Logout)
}
