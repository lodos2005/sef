package keycloak

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/Nerzal/gocloak/v13"
	"github.com/golang-jwt/jwt/v5"
)

// Client wraps the Gocloak client with our configuration
type Client struct {
	gocloak      *gocloak.GoCloak
	url          string
	realm        string
	clientID     string
	clientSecret string
	redirectURL  string
}

// UserInfo represents the user information from Keycloak
type UserInfo struct {
	Sub               string `json:"sub"`
	Email             string `json:"email"`
	EmailVerified     bool   `json:"email_verified"`
	Name              string `json:"name"`
	PreferredUsername string `json:"preferred_username"`
	GivenName         string `json:"given_name"`
	FamilyName        string `json:"family_name"`
	Locale            string `json:"locale"`
}

// NewClient creates a new Keycloak client
func NewClient(url, realm, clientID, clientSecret, redirectURL string) *Client {
	return &Client{
		gocloak:      gocloak.NewClient(url),
		url:          url,
		realm:        realm,
		clientID:     clientID,
		clientSecret: clientSecret,
		redirectURL:  redirectURL,
	}
}

// GetLoginURL generates the Keycloak login URL
func (c *Client) GetLoginURL(state string) string {
	return fmt.Sprintf(
		"%s/realms/%s/protocol/openid-connect/auth?client_id=%s&redirect_uri=%s&response_type=code&scope=openid&state=%s",
		strings.TrimSuffix(c.url, "/"),
		c.realm,
		c.clientID,
		c.redirectURL,
		state,
	)
}

// GetLogoutURL generates the Keycloak logout URL
func (c *Client) GetLogoutURL(redirectURL string) string {
	return fmt.Sprintf(
		"%s/realms/%s/protocol/openid-connect/logout?redirect_uri=%s",
		strings.TrimSuffix(c.url, "/"),
		c.realm,
		redirectURL,
	)
}

// ExchangeCodeForToken exchanges an authorization code for tokens
func (c *Client) ExchangeCodeForToken(ctx context.Context, code string) (*gocloak.JWT, error) {
	return c.gocloak.GetToken(
		ctx,
		c.realm,
		gocloak.TokenOptions{
			ClientID:     &c.clientID,
			ClientSecret: &c.clientSecret,
			Code:         &code,
			RedirectURI:  &c.redirectURL,
			GrantType:    gocloak.StringP("authorization_code"),
		},
	)
}

// RefreshToken refreshes an access token using a refresh token
func (c *Client) RefreshToken(ctx context.Context, refreshToken string) (*gocloak.JWT, error) {
	return c.gocloak.RefreshToken(
		ctx,
		refreshToken,
		c.clientID,
		c.clientSecret,
		c.realm,
	)
}

// VerifyToken verifies and decodes a Keycloak access token
func (c *Client) VerifyToken(ctx context.Context, accessToken string) (*UserInfo, error) {
	// Get the user info from Keycloak
	userInfo, err := c.gocloak.GetUserInfo(ctx, accessToken, c.realm)
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %w", err)
	}

	// Marshal and unmarshal to convert to our UserInfo struct
	data, err := json.Marshal(userInfo)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal user info: %w", err)
	}

	var user UserInfo
	if err := json.Unmarshal(data, &user); err != nil {
		return nil, fmt.Errorf("failed to unmarshal user info: %w", err)
	}

	return &user, nil
}

// GetUserRoles retrieves the roles assigned to a user from the token
func (c *Client) GetUserRoles(accessToken string) ([]string, error) {
	// Parse the token without verification (we already verified it)
	token, _, err := jwt.NewParser().ParseUnverified(accessToken, jwt.MapClaims{})
	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid token claims")
	}

	// Extract realm roles
	var roles []string
	if realmAccess, ok := claims["realm_access"].(map[string]interface{}); ok {
		if realmRoles, ok := realmAccess["roles"].([]interface{}); ok {
			for _, role := range realmRoles {
				if roleStr, ok := role.(string); ok {
					roles = append(roles, roleStr)
				}
			}
		}
	}

	// Extract client roles
	if resourceAccess, ok := claims["resource_access"].(map[string]interface{}); ok {
		if clientAccess, ok := resourceAccess[c.clientID].(map[string]interface{}); ok {
			if clientRoles, ok := clientAccess["roles"].([]interface{}); ok {
				for _, role := range clientRoles {
					if roleStr, ok := role.(string); ok {
						roles = append(roles, roleStr)
					}
				}
			}
		}
	}

	return roles, nil
}

// HasRole checks if a user has a specific role
func (c *Client) HasRole(accessToken, roleName string) bool {
	roles, err := c.GetUserRoles(accessToken)
	if err != nil {
		return false
	}

	for _, role := range roles {
		if role == roleName {
			return true
		}
	}
	return false
}

// Logout performs a server-side logout
func (c *Client) Logout(ctx context.Context, refreshToken string) error {
	return c.gocloak.Logout(ctx, c.clientID, c.clientSecret, c.realm, refreshToken)
}
