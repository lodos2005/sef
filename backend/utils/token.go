package utils

import (
	"errors"
	"sef/app/entities"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/golang-jwt/jwt/v5"
)

type Claim struct {
	Username string
	ID       uint
}

type WorkerClaim struct {
	DeviceID  string
	IPAddress string
}

func CreateToken(username string, id uint) (string, error) {
	token := jwt.New(jwt.SigningMethodHS256)

	claims := token.Claims.(jwt.MapClaims)
	claims["username"] = username
	claims["user_id"] = id
	claims["exp"] = time.Now().Add(time.Hour * 72).Unix()

	appKey := "3t7Ca+3fFqzSpsUkqmmTMlT2eUKPlrs3+irYZ+KP0PY="
	if appKey == "" {
		appKey = "sef"
	}

	return token.SignedString([]byte(appKey))
}

func GetClaimFromContext(c fiber.Ctx) Claim {
	user := c.Locals("token").(*jwt.Token)
	claims := user.Claims.(jwt.MapClaims)

	username, ok := claims["username"].(string)
	if !ok {
		username = ""
	}

	userID, ok := claims["user_id"].(float64)
	if !ok {
		userID = 0
	}

	return Claim{
		Username: username,
		ID:       uint(userID),
	}
}

func GetUserFromContext(c fiber.Ctx) (*entities.User, error) {
	claim := GetClaimFromContext(c)
	return GetUserByID(claim.ID)
}

// VerifyUserFromContext verifies that the user from JWT context exists and is not deleted
func VerifyUserFromContext(c fiber.Ctx) (*entities.User, error) {
	user, err := GetUserFromContext(c)
	if err != nil {
		return nil, err
	}

	// Check if user is deleted (soft delete)
	if user.DeletedAt.Valid {
		return nil, errors.New("user account is deactivated")
	}

	return user, nil
}
