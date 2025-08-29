package server

import (
	"encoding/json"
	"log"
	"sef/app/controllers/users"
	"sef/app/middleware"
	"sef/app/routes"
	"sef/internal/bootstrap"
	"sef/internal/error_handler"
	"sef/internal/jwtware"
	"sef/internal/migration"
	"sef/pkg/seeds"
	"sef/utils"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/compress"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/recover"

	_ "sef/pkg/aes"
)

var adminConfig = fiber.Config{
	BodyLimit:    32 * 1024 * 1024,
	JSONEncoder:  json.Marshal,
	JSONDecoder:  json.Unmarshal,
	ErrorHandler: error_handler.ErrorHandler,
}

var config, _ = bootstrap.NewConf()

func RunServer() {
	if !fiber.IsChild() {
		if err := migration.Init(); err != nil {
			log.Fatalf("error when making migrations, err: %s\n", err.Error())
		}

		if err := seeds.Init(); err != nil {
			log.Fatalf("error when seeding, err: %s\n", err.Error())
		}
	}

	app := fiber.New(adminConfig)
	app.Use(recover.New(recover.Config{EnableStackTrace: true}))
	app.Use(compress.New())
	app.Use(logger.New())

	// Key must be generated with openssl rand -base64 32
	// app.Use(encryptcookie.New(encryptcookie.Config{
	// 	Key: "3t7Ca+3fFqzSpsUkqmmTMlT2eUKPlrs3+irYZ+KP0PY=",
	// }))

	app.Post("/api/v1/login", users.Login)
	app.Use(middleware.TokenLookup)
	app.Use(Protected())

	routes.Server(app)

	log.Fatal(app.Listen("0.0.0.0:8110"))
}

func Protected() fiber.Handler {
	return jwtware.New(jwtware.Config{
		SigningKey: jwtware.SigningKey{
			JWTAlg: "HS256",
			Key:    []byte("3t7Ca+3fFqzSpsUkqmmTMlT2eUKPlrs3+irYZ+KP0PY="),
		},
		ErrorHandler: func(c fiber.Ctx, err error) error {
			return error_handler.ErrorHandler(c, utils.NewAuthError())
		},
		ContextKey: "token",
		SuccessHandler: func(c fiber.Ctx) error {
			claims := utils.GetClaimFromContext(c)
			user, err := utils.GetUserByID(claims.ID)
			if err != nil {
				return error_handler.ErrorHandler(c, utils.NewAuthError())
			}
			// Check if user is deleted (soft delete)
			if user.DeletedAt.Valid {
				return error_handler.ErrorHandler(c, utils.NewAuthError())
			}
			user.Password = ""
			c.Locals("user", user)
			return c.Next()
		},
	})
}
