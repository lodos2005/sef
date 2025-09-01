package migration

import (
	"log"
	"sef/app/entities"
	"sef/internal/database"
)

func Init() error {
	if database.Connection() == nil {
		log.Fatalln("database connection is nil")
		return nil
	}

	if err := database.Connection().AutoMigrate(&entities.User{}); err != nil {
		return err
	}
	if err := database.Connection().AutoMigrate(&entities.Provider{}); err != nil {
		return err
	}
	if err := database.Connection().AutoMigrate(&entities.Tool{}); err != nil {
		return err
	}
	if err := database.Connection().AutoMigrate(&entities.Chatbot{}); err != nil {
		return err
	}
	if err := database.Connection().AutoMigrate(&entities.ChatSession{}); err != nil {
		return err
	}
	if err := database.Connection().AutoMigrate(&entities.Message{}); err != nil {
		return err
	}
	return nil
}
