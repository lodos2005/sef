package seeds

import (
	"sef/app/entities"
	"sef/internal/database"
	"sef/utils"
)

func Init() error {
	_, err := utils.GetByUsername("sef")
	if err != nil {
		hashed, err := utils.CreateHash("sef")
		if err != nil {
			return err
		}
		t := true
		return database.Connection().Create(&entities.User{
			Name:       "Admin",
			Username:   "sef",
			Password:   hashed,
			SuperAdmin: &t,
		}).Error
	}

	return nil
}
