package seeds

import (
	"sef/app/entities"
	"sef/internal/database"
	"sef/utils"
)

func Init() error {
	_, err := utils.GetByUsername("sef")
	if err != nil {
		hashed, err := utils.CreateHash("sef123456")
		if err != nil {
			return err
		}
		return database.Connection().Create(&entities.User{
			Name:       "Admin",
			Username:   "sef",
			Password:   hashed,
			SuperAdmin: utils.BoolPtr(true),
		}).Error
	}

	return nil
}
