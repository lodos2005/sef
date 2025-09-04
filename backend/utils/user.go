package utils

import (
	"sef/app/entities"
	"sef/internal/database"

	"golang.org/x/crypto/bcrypt"
)

func CreateHash(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 6)
	return string(bytes), err
}

func CheckPasswordHash(password, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

func GetByUsername(username string) (*entities.User, error) {
	var user *entities.User
	db := database.Connection().
		Where("username = ?", username)

	if err := db.First(&user).Error; err != nil {
		return nil, err
	}

	return user, nil
}

func GetUserByID(id uint) (*entities.User, error) {
	var user *entities.User
	if err := database.Connection().
		Where("id = ?", id).First(&user).Error; err != nil {
		return nil, err
	}

	return user, nil
}
