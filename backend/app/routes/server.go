package routes

import (
	"sef/app/controllers/auth"
	"sef/app/controllers/chatbots"
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
		authGroup.Post("/logout", auth.Logout)
	}

	apiV1.Use(middleware.TokenLookup)
	apiV1.Use(middleware.Authenticated())

	authGroup = apiV1.Group("/auth")
	{
		authGroup.Get("/me", auth.CurrentUser)
	}

	userGroup := apiV1.Group("/users")
	{
		controller := &users.Controller{
			DB: database.Connection(),
		}

		userGroup.Use(middleware.IsSuperAdmin())
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
		chatbotsGroup.Get("/:id", controller.Show)

		chatbotsGroup.Use(middleware.IsSuperAdmin())
		chatbotsGroup.Post("/", controller.Create)
		chatbotsGroup.Patch("/:id", controller.Update)
		chatbotsGroup.Delete("/:id", controller.Delete)
	}

	providersGroup := apiV1.Group("/providers")
	{
		controller := &providers.Controller{
			DB: database.Connection(),
		}

		providersGroup.Use(middleware.IsSuperAdmin())
		providersGroup.Get("/", controller.Index)
		providersGroup.Get("/types", controller.Types)
		providersGroup.Get("/:id", controller.Show)
		providersGroup.Get("/:id/models", controller.Models)
		providersGroup.Post("/", controller.Create)
		providersGroup.Patch("/:id", controller.Update)
		providersGroup.Delete("/:id", controller.Delete)
	}

	sessionsGroup := apiV1.Group("/sessions")
	{
		controller := &sessions.Controller{
			DB: database.Connection(),
		}

		sessionsAdminGroup := sessionsGroup.Group("/admin")
		{
			sessionsAdminGroup.Use(middleware.IsSuperAdmin())
			sessionsAdminGroup.Get("/", controller.IndexAdmin)
		}

		// GetUserSessions
		sessionsGroup.Get("/", controller.Index)
		// GetSession
		sessionsGroup.Get("/:id", controller.Show)
		// CreateSession
		sessionsGroup.Post("/", controller.Create)
		// DeleteSession
		sessionsGroup.Delete("/:id", controller.Delete)

		// GetSessionMessages
		sessionsGroup.Get("/:id/messages", controller.Messages)
		// SendMessage
		sessionsGroup.Post("/:id/messages", controller.SendMessage)

	}
}
