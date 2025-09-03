package routes

import (
	"sef/app/controllers/chatbots"
	"sef/app/controllers/chats"
	"sef/app/controllers/providers"
	"sef/app/controllers/tools"
	"sef/app/controllers/users"

	"github.com/gofiber/fiber/v3"
)

func Server(app *fiber.App) {
	apiV1 := app.Group("/api/v1")

	// Authentication routes
	apiV1.Post("/login", users.Login)

	userGroup := apiV1.Group("/users")
	{
		userGroup.Get("/me", users.CurrentUser)
		userGroup.Get("/", users.Index)
		userGroup.Post("/", users.Create)
		userGroup.Get("/:id", users.Show)
		userGroup.Patch("/:id", users.Update)
		userGroup.Delete("/:id", users.Delete)
	}

	providerGroup := apiV1.Group("/providers")
	{
		providerGroup.Get("/", providers.Index)
		providerGroup.Post("/", providers.Create)
		providerGroup.Get("/:id", providers.Show)
		providerGroup.Patch("/:id", providers.Update)
		providerGroup.Delete("/:id", providers.Delete)
		providerGroup.Get("/:type/models", providers.GetModels)
	}

	chatbotGroup := apiV1.Group("/chatbots")
	{
		chatbotGroup.Get("/", chatbots.Index)
		chatbotGroup.Post("/", chatbots.Create)
		chatbotGroup.Get("/:id", chatbots.Show)
		chatbotGroup.Patch("/:id", chatbots.Update)
		chatbotGroup.Delete("/:id", chatbots.Delete)
	}

	toolGroup := apiV1.Group("/tools")
	{
		toolGroup.Get("/", tools.Index)
		toolGroup.Post("/", tools.Create)
		toolGroup.Get("/:id", tools.Show)
		toolGroup.Patch("/:id", tools.Update)
		toolGroup.Delete("/:id", tools.Delete)
	}

	chatGroup := apiV1.Group("/chats")
	{
		chatGroup.Get("/", chats.GetUserSessions)
		chatGroup.Post("/", chats.CreateSession)
		chatGroup.Get("/:id", chats.GetSession)
		chatGroup.Patch("/:id", chats.UpdateSession)
		chatGroup.Delete("/:id", chats.DeleteSession)
		chatGroup.Post("/:id/messages", chats.SendMessage)
		chatGroup.Get("/:id/messages", chats.GetSessionMessages)
	}

	// Admin routes
	adminGroup := apiV1.Group("/admin")
	{
		adminGroup.Get("/users", users.Index)
		adminGroup.Get("/users/:id", users.Show)
		adminGroup.Post("/users", users.Create)
		adminGroup.Patch("/users/:id", users.Update)
		adminGroup.Delete("/users/:id", users.Delete)

		adminGroup.Get("/providers", providers.Index)
		adminGroup.Get("/providers/:id", providers.Show)
		adminGroup.Post("/providers", providers.Create)
		adminGroup.Patch("/providers/:id", providers.Update)
		adminGroup.Delete("/providers/:id", providers.Delete)

		adminGroup.Get("/chatbots", chatbots.Index)
		adminGroup.Get("/chatbots/:id", chatbots.Show)
		adminGroup.Post("/chatbots", chatbots.Create)
		adminGroup.Patch("/chatbots/:id", chatbots.Update)
		adminGroup.Delete("/chatbots/:id", chatbots.Delete)

		adminGroup.Get("/tools", tools.Index)
		adminGroup.Get("/tools/:id", tools.Show)
		adminGroup.Post("/tools", tools.Create)
		adminGroup.Patch("/tools/:id", tools.Update)
		adminGroup.Delete("/tools/:id", tools.Delete)

		adminGroup.Get("/chats", chats.GetAllSessions)
		adminGroup.Get("/chats/:id", chats.GetSessionByID)
		adminGroup.Post("/chats", chats.CreateSessionAdmin)
		adminGroup.Patch("/chats/:id", chats.UpdateSessionAdmin)
		adminGroup.Delete("/chats/:id", chats.DeleteSessionAdmin)
	}

	apiV1.Post("/logout", users.Logout)
}
