package utils

import (
	"sef/internal/bootstrap"
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

	config, err := bootstrap.NewConf()
	if err != nil {
		return "", err
	}

	appKey := config.MustString("app.key")
	if appKey == "" {
		appKey = "sef"
	}

	return token.SignedString([]byte(appKey))
}

func GetClaimFromContext(c fiber.Ctx) Claim {
	user := c.Locals("token").(*jwt.Token)
	claims := user.Claims.(jwt.MapClaims)
	return Claim{
		Username: claims["username"].(string),
		ID:       uint(claims["user_id"].(float64)),
	}
}
