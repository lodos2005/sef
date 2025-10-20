package middleware

import (
	"context"
	"sef/app/controllers/auth"
	"sef/app/entities"
	"sef/internal/database"
	"sef/internal/error_handler"
	"sef/pkg/config"
	"sef/pkg/keycloak"
	"sef/utils"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
)

var keycloakClient *keycloak.Client

func initKeycloak() error {
	if keycloakClient != nil {
		return nil
	}

	cfg, err := config.Load()
	if err != nil {
		return err
	}

	keycloakClient = keycloak.NewClient(
		cfg.Keycloak.URL,
		cfg.Keycloak.Realm,
		cfg.Keycloak.ClientID,
		cfg.Keycloak.ClientSecret,
		cfg.Keycloak.RedirectURL,
	)

	return nil
}

func Authenticated() fiber.Handler {
	return func(c fiber.Ctx) error {
		// Initialize Keycloak client if needed
		if err := initKeycloak(); err != nil {
			log.Info("Failed to initialize Keycloak client: %v", err)
			return error_handler.ErrorHandler(c, utils.NewAuthError())
		}

		// Get access token from cookie
		accessToken := c.Cookies("access_token")
		refreshToken := c.Cookies("refresh_token")
		if accessToken == "" && refreshToken == "" {
			log.Info("Missing access or refresh token in cookies")
			return error_handler.ErrorHandler(c, utils.NewAuthError())
		}

		// Verify token with Keycloak
		ctx := context.Background()
		userInfo, err := keycloakClient.VerifyToken(ctx, accessToken)
		if err != nil {
			// Try to refresh the token
			if refreshToken != "" {
				if newToken, refreshErr := keycloakClient.RefreshToken(ctx, refreshToken); refreshErr == nil {
					// Update access token
					accessToken = newToken.AccessToken
					auth.SetTokenCookies(c, newToken)

					// Re-verify with new token
					userInfo, err = keycloakClient.VerifyToken(ctx, accessToken)
					if err != nil {
						return error_handler.ErrorHandler(c, utils.NewAuthError())
					}
				} else {
					return error_handler.ErrorHandler(c, utils.NewAuthError())
				}
			} else {
				return error_handler.ErrorHandler(c, utils.NewAuthError())
			}
		}

		// Find user in database
		var user entities.User
		db := database.Connection()
		if err := db.Where("keycloak_id = ?", userInfo.Sub).First(&user).Error; err != nil {
			return error_handler.ErrorHandler(c, utils.NewAuthError())
		}

		// Get user roles and update admin status
		roles, _ := keycloakClient.GetUserRoles(accessToken)
		isAdmin := false
		for _, role := range roles {
			if role == "admin" {
				isAdmin = true
				break
			}
		}

		// Update user's admin status if changed
		if user.IsAdmin != isAdmin {
			user.IsAdmin = isAdmin
			db.Save(&user)
		}

		// Store user in context
		c.Locals("user", &user)
		c.Locals("access_token", accessToken)

		return c.Next()
	}
}
