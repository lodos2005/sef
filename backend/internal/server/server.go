package server

import (
	"encoding/json"
	"log"
	"sef/app/routes"
	"sef/internal/bootstrap"
	"sef/internal/database"
	"sef/internal/error_handler"
	"sef/internal/migration"
	"sef/pkg/seeds"

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
		if database.Connection() == nil {
			log.Fatal("database connection is not established")
		}

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

	routes.Server(app)

	log.Fatal(app.Listen("0.0.0.0:8110"))
}
