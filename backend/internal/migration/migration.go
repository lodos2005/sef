package migration

import (
	"sef/app/entities"
	"sef/internal/database"
)

func Init() error {
	if err := database.Connection().AutoMigrate(&entities.User{}); err != nil {
		return err
	}
	if err := database.Connection().AutoMigrate(&entities.Provider{}); err != nil {
		return err
	}
	if err := database.Connection().AutoMigrate(&entities.Chatbot{}); err != nil {
		return err
	}
	if err := database.Connection().AutoMigrate(&entities.Session{}); err != nil {
		return err
	}
	if err := database.Connection().AutoMigrate(&entities.Message{}); err != nil {
		return err
	}
	if err := database.Connection().AutoMigrate(&entities.Tool{}); err != nil {
		return err
	}
	if err := database.Connection().AutoMigrate(&entities.Document{}); err != nil {
		return err
	}
	if err := database.Connection().AutoMigrate(&entities.Settings{}); err != nil {
		return err
	}
	return nil
}
