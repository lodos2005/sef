package auth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"sef/app/entities"
	"sef/internal/database"
	"sef/pkg/config"
	"sef/pkg/keycloak"
	"time"

	"github.com/Nerzal/gocloak/v13"
	"github.com/gofiber/fiber/v3"
)

var keycloakClient *keycloak.Client

// InitKeycloak initializes the Keycloak client
func InitKeycloak() error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
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

// SetTokenCookies sets the access and refresh token cookies
func SetTokenCookies(c fiber.Ctx, token *gocloak.JWT) {
	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    token.AccessToken,
		HTTPOnly: true,
		Expires:  time.Now().Add(time.Duration(token.ExpiresIn) * time.Second),
		SameSite: "None",
		Secure:   true,
	})

	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    token.RefreshToken,
		HTTPOnly: true,
		Expires:  time.Now().Add(time.Duration(token.RefreshExpiresIn) * time.Second),
		SameSite: "None",
		Secure:   true,
	})
}

// generateState generates a random state parameter for OAuth
func generateState() (string, error) {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}

// Login initiates the Keycloak login flow
func Login(c fiber.Ctx) error {
	if keycloakClient == nil {
		if err := InitKeycloak(); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Keycloak not configured")
		}
	}

	// Generate a random state parameter for CSRF protection
	state, err := generateState()
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Failed to generate state")
	}

	// Store state in session/cookie for verification in callback
	c.Cookie(&fiber.Cookie{
		Name:     "oauth_state",
		Value:    state,
		HTTPOnly: true,
		Expires:  time.Now().Add(10 * time.Minute),
		SameSite: "Lax",
		Secure:   true,
	})

	// Return the login URL
	loginURL := keycloakClient.GetLoginURL(state)
	return c.JSON(fiber.Map{
		"login_url": loginURL,
	})
}

// Callback handles the OAuth callback from Keycloak
func Callback(c fiber.Ctx) error {
	if keycloakClient == nil {
		if err := InitKeycloak(); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Keycloak not configured")
		}
	}

	// Verify state parameter
	state := c.Query("state")
	savedState := c.Cookies("oauth_state")
	if state == "" || state != savedState {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid state parameter")
	}

	// Clear the state cookie
	c.Cookie(&fiber.Cookie{
		Name:     "oauth_state",
		Value:    "",
		HTTPOnly: true,
		Expires:  time.Now().Add(-1 * time.Hour),
	})

	// Get the authorization code
	code := c.Query("code")
	if code == "" {
		return fiber.NewError(fiber.StatusBadRequest, "Missing authorization code")
	}

	// Exchange code for tokens
	ctx := context.Background()
	token, err := keycloakClient.ExchangeCodeForToken(ctx, code)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, fmt.Sprintf("Failed to exchange code: %v", err))
	}

	// Get user info from Keycloak
	userInfo, err := keycloakClient.VerifyToken(ctx, token.AccessToken)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, fmt.Sprintf("Failed to verify token: %v", err))
	}

	// Get user roles
	roles, _ := keycloakClient.GetUserRoles(token.AccessToken)
	isAdmin := false
	for _, role := range roles {
		if role == "admin" {
			isAdmin = true
			break
		}
	}

	// Find or create user in database
	var user entities.User
	db := database.Connection()
	result := db.Where("keycloak_id = ?", userInfo.Sub).First(&user)

	if result.Error != nil {
		// User doesn't exist, create new one
		locale := entities.LocaleTR
		if userInfo.Locale == "en" {
			locale = entities.LocaleEN
		}

		user = entities.User{
			KeycloakID: userInfo.Sub,
			Name:       userInfo.Name,
			Username:   userInfo.PreferredUsername,
			Email:      userInfo.Email,
			Locale:     locale,
			IsAdmin:    isAdmin,
		}

		if err := db.Create(&user).Error; err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Failed to create user")
		}
	} else {
		// Update existing user
		user.Name = userInfo.Name
		user.Email = userInfo.Email
		user.IsAdmin = isAdmin

		if err := db.Save(&user).Error; err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Failed to update user")
		}
	}

	// Store tokens in HTTP-only cookies
	SetTokenCookies(c, token)

	return c.JSON(fiber.Map{
		"message": "Login successful",
		"user":    user,
	})
}

// CurrentUser returns the currently authenticated user
func CurrentUser(c fiber.Ctx) error {
	user := c.Locals("user").(*entities.User)
	return c.JSON(user)
}

// Logout logs out the user
func Logout(c fiber.Ctx) error {
	if keycloakClient == nil {
		if err := InitKeycloak(); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Keycloak not configured")
		}
	}

	// Get refresh token for server-side logout
	refreshToken := c.Cookies("refresh_token")
	if refreshToken != "" {
		ctx := context.Background()
		_ = keycloakClient.Logout(ctx, refreshToken)
	}

	// Clear cookies
	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    "",
		HTTPOnly: true,
		Expires:  time.Now().Add(-100 * time.Hour),
	})

	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    "",
		HTTPOnly: true,
		Expires:  time.Now().Add(-100 * time.Hour),
	})

	// Get logout URL
	cfg, _ := config.Load()
	logoutURL := keycloakClient.GetLogoutURL(cfg.Keycloak.RedirectURL)

	return c.JSON(fiber.Map{
		"message":    "Logged out successfully",
		"logout_url": logoutURL,
	})
}

// RefreshToken refreshes the access token
func RefreshToken(c fiber.Ctx) error {
	if keycloakClient == nil {
		if err := InitKeycloak(); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Keycloak not configured")
		}
	}

	refreshToken := c.Cookies("refresh_token")
	if refreshToken == "" {
		return fiber.NewError(fiber.StatusUnauthorized, "No refresh token")
	}

	ctx := context.Background()
	token, err := keycloakClient.RefreshToken(ctx, refreshToken)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "Failed to refresh token")
	}

	// Update cookies
	SetTokenCookies(c, token)

	return c.JSON(fiber.Map{"message": "Token refreshed"})
}
