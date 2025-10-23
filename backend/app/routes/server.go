package routes

import (
	"sef/app/controllers/auth"
	"sef/app/controllers/chatbots"
	"sef/app/controllers/documents"
	"sef/app/controllers/providers"
	"sef/app/controllers/sessions"
	"sef/app/controllers/settings"
	"sef/app/controllers/tool_categories"
	"sef/app/controllers/tools"
	"sef/app/entities"
	"sef/app/middleware"
	"sef/internal/database"
	"sef/pkg/config"
	"sef/pkg/documentservice"
	"sef/pkg/messaging"
	"sef/pkg/rag"
	"sef/pkg/summary"

	"github.com/gofiber/fiber/v3"
)

func Server(app *fiber.App) {
	apiV1 := app.Group("/api/v1")

	// Public auth endpoints (no authentication required)
	authGroup := apiV1.Group("/auth")
	{
		authGroup.Get("/login", auth.Login)
		authGroup.Get("/callback", auth.Callback)
		authGroup.Post("/logout", auth.Logout)
		authGroup.Post("/refresh", auth.RefreshToken)
	}

	// Protected routes (authentication required)
	apiV1.Use(middleware.TokenLookup)
	apiV1.Use(middleware.Authenticated())

	authGroup = apiV1.Group("/auth")
	{
		authGroup.Get("/me", auth.CurrentUser)
	}

	apiV1.Post("/locale", func(c fiber.Ctx) error {
		var body struct {
			Locale string `json:"locale"`
		}
		if err := c.Bind().JSON(&body); err != nil {
			return err
		}

		user := c.Locals("user").(*entities.User)
		user.Locale = entities.Locale(body.Locale)
		if err := database.Connection().Model(user).Where("id = ?", user.ID).Update("locale", user.Locale).Error; err != nil {
			return fiber.ErrInternalServerError
		}
		return c.SendStatus(fiber.StatusOK)
	})

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

	toolCategoriesGroup := apiV1.Group("/tool-categories")
	{
		controller := &tool_categories.Controller{
			DB: database.Connection(),
		}

		toolCategoriesGroup.Use(middleware.IsSuperAdmin())
		toolCategoriesGroup.Get("/", controller.Index)
		toolCategoriesGroup.Get("/:id", controller.Show)
		toolCategoriesGroup.Post("/", controller.Create)
		toolCategoriesGroup.Patch("/:id", controller.Update)
		toolCategoriesGroup.Delete("/:id", controller.Delete)
	}

	toolsGroup := apiV1.Group("/tools")
	{
		controller := &tools.Controller{
			DB: database.Connection(),
		}

		toolsGroup.Use(middleware.IsSuperAdmin())
		toolsGroup.Get("/", controller.Index)
		toolsGroup.Get("/types", controller.Types)
		toolsGroup.Get("/schema", controller.Schema)
		toolsGroup.Get("/:id", controller.Show)
		toolsGroup.Post("/", controller.Create)
		toolsGroup.Post("/import", controller.Import)
		toolsGroup.Post("/export", controller.Export)
		toolsGroup.Patch("/:id", controller.Update)
		toolsGroup.Delete("/:id", controller.Delete)
		toolsGroup.Post("/:id/test", controller.Test)
		toolsGroup.Post("/:id/test-jq", controller.TestJq)
		toolsGroup.Post("/:id/generate-jq", controller.GenerateJq)
	}

	cfg, _ := config.Load()
	docService := documentservice.NewDocumentService(
		database.Connection(),
		cfg.QdrantURL,
	)

	sessionsGroup := apiV1.Group("/sessions")
	{
		ragService := rag.NewRAGService(database.Connection(), docService)

		controller := &sessions.Controller{
			DB: database.Connection(),
			MessagingService: &messaging.MessagingService{
				DB:         database.Connection(),
				RAGService: ragService,
			},
			SummaryService: summary.NewSummaryService(database.Connection()),
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

	documentsGroup := apiV1.Group("/documents")
	{
		controller := &documents.Controller{
			DB:              database.Connection(),
			DocumentService: docService,
		}

		// All document endpoints require admin
		documentsGroup.Use(middleware.IsSuperAdmin())
		documentsGroup.Get("/", controller.Index)
		documentsGroup.Get("/:id", controller.Show)
		documentsGroup.Post("/upload", controller.Upload)
		documentsGroup.Delete("/:id", controller.Delete)
		documentsGroup.Post("/search", controller.Search)
		documentsGroup.Get("/:id/process", controller.ProcessManually)
	}

	settingsGroup := apiV1.Group("/settings")
	{
		controller := &settings.Controller{
			DB: database.Connection(),
		}

		settingsGroup.Use(middleware.IsSuperAdmin())
		settingsGroup.Get("/embedding", controller.GetEmbeddingConfig)
		settingsGroup.Put("/embedding", controller.UpdateEmbeddingConfig)
		settingsGroup.Get("/embedding/models/:provider_id", controller.ListEmbeddingModels)
	}
}
