package routes

import (
	"sef/app/controllers/auth"
	"sef/app/controllers/chatbots"
	"sef/app/controllers/messages"
	"sef/app/controllers/providers"
	"sef/app/controllers/sessions"
	"sef/app/controllers/users"
	"sef/app/middleware"
	"sef/internal/database"

	"github.com/gofiber/fiber/v3"
)

func Server(app *fiber.App) {
	apiV1 := app.Group("/api/v1")

	authGroup := apiV1.Group("/auth")
	{
		authGroup.Post("/login", auth.Login)
	}

	apiV1.Use(middleware.TokenLookup)
	apiV1.Use(middleware.Authenticated())

	authGroup = apiV1.Group("/auth")
	{
		authGroup.Get("/me", auth.CurrentUser)
	}

	// Admin routes
	apiV1.Use(middleware.IsSuperAdmin())

	userGroup := apiV1.Group("/users")
	{
		controller := &users.Controller{
			DB: database.Connection(),
		}

		userGroup.Get("/", controller.Index)
		userGroup.Post("/", controller.Create)
		userGroup.Get("/:id", controller.Show)
		userGroup.Patch("/:id", controller.Update)
		userGroup.Delete("/:id", controller.Delete)
	}

	chatbotsGroup := apiV1.Group("/chatbots")
	{
		controller := &chatbots.Controller{
			DB: database.Connection(),
		}

		chatbotsGroup.Get("/", controller.Index)
		chatbotsGroup.Post("/", controller.Create)
		chatbotsGroup.Get("/:id", controller.Show)
		chatbotsGroup.Patch("/:id", controller.Update)
		chatbotsGroup.Delete("/:id", controller.Delete)
	}

	messagesGroup := apiV1.Group("/messages")
	{
		controller := &messages.Controller{
			DB: database.Connection(),
		}

		messagesGroup.Get("/", controller.Index)
		messagesGroup.Post("/", controller.Create)
		messagesGroup.Get("/:id", controller.Show)
		messagesGroup.Patch("/:id", controller.Update)
		messagesGroup.Delete("/:id", controller.Delete)
	}

	providersGroup := apiV1.Group("/providers")
	{
		controller := &providers.Controller{
			DB: database.Connection(),
		}

		providersGroup.Get("/", controller.Index)
		providersGroup.Post("/", controller.Create)
		providersGroup.Get("/:id", controller.Show)
		providersGroup.Patch("/:id", controller.Update)
		providersGroup.Delete("/:id", controller.Delete)
	}

	sessionsGroup := apiV1.Group("/sessions")
	{
		controller := &sessions.Controller{
			DB: database.Connection(),
		}

		sessionsGroup.Get("/", controller.Index)
		sessionsGroup.Post("/", controller.Create)
		sessionsGroup.Get("/:id", controller.Show)
		sessionsGroup.Patch("/:id", controller.Update)
		sessionsGroup.Delete("/:id", controller.Delete)
	}
}
