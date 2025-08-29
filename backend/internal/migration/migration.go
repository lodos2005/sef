package migration

import (
	"sef/app/entities"
	"sef/internal/database"
)

func Init() error {
	if err := database.Connection().AutoMigrate(&entities.User{}); err != nil {
		return err
	}
	return nil
}
