package middleware

import (
	"sef/internal/bootstrap"
	"sef/internal/error_handler"
	"sef/internal/jwtware"
	"sef/utils"

	"github.com/gofiber/fiber/v3"
)

func Authenticated() fiber.Handler {
	config, _ := bootstrap.NewConf()

	return jwtware.New(jwtware.Config{
		SigningKey: jwtware.SigningKey{
			JWTAlg: "HS256",
			Key:    []byte(config.MustString("app.key")),
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
			user.Password = ""
			c.Locals("user", user)
			return c.Next()
		},
	})
}
