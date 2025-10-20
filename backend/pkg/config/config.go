package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// AppConfig represents application configuration
type AppConfig struct {
	Debug bool   `json:"debug"`
	Key   string `json:"key"`
	Mode  string `json:"mode"`
}

// DatabaseConfig represents database configuration
type DatabaseConfig struct {
	Debug    bool   `json:"debug"`
	Host     string `json:"host"`
	Name     string `json:"name"`
	Password string `json:"password"`
	Port     int    `json:"port"`
	User     string `json:"user"`
}

// KeycloakConfig represents Keycloak configuration
type KeycloakConfig struct {
	URL          string `json:"url"`
	Realm        string `json:"realm"`
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	RedirectURL  string `json:"redirect_url"`
}

// Config represents the complete application configuration
type Config struct {
	App       AppConfig      `json:"app"`
	Database  DatabaseConfig `json:"database"`
	Keycloak  KeycloakConfig `json:"keycloak"`
	QdrantURL string         `json:"qdrant_url"`
	OllamaURL string         `json:"ollama_url"`
}

// Load loads configuration from .env file
func Load() (*Config, error) {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: .env file not found, using environment variables: %v", err)
	}

	config := &Config{}

	// Load App configuration
	config.App = AppConfig{
		Debug: getEnvAsBool("APP_DEBUG", true),
		Key:   getEnv("APP_KEY", "51652890423324431179641745083372"),
		Mode:  getEnv("APP_MODE", "dev"),
	}

	// Load Database configuration
	config.Database = DatabaseConfig{
		Debug:    getEnvAsBool("DATABASE_DEBUG", true),
		Host:     getEnv("DATABASE_HOST", "localhost"),
		Name:     getEnv("DATABASE_NAME", "mydb"),
		Password: getEnv("DATABASE_PASSWORD", "postgres"),
		Port:     getEnvAsInt("DATABASE_PORT", 5432),
		User:     getEnv("DATABASE_USER", "postgres"),
	}

	// Load Keycloak configuration
	config.Keycloak = KeycloakConfig{
		URL:          getEnv("KEYCLOAK_URL", "http://localhost:8080"),
		Realm:        getEnv("KEYCLOAK_REALM", "master"),
		ClientID:     getEnv("KEYCLOAK_CLIENT_ID", "sef-app"),
		ClientSecret: getEnv("KEYCLOAK_CLIENT_SECRET", ""),
		RedirectURL:  getEnv("KEYCLOAK_REDIRECT_URL", "http://localhost:3000/auth/callback"),
	}

	// Load Qdrant and Ollama URLs
	qdrantHost := getEnv("QDRANT_HOST", "localhost")
	qdrantPort := getEnv("QDRANT_PORT", "6333")
	config.QdrantURL = "http://" + qdrantHost + ":" + qdrantPort

	ollamaHost := getEnv("OLLAMA_HOST", "localhost")
	ollamaPort := getEnv("OLLAMA_PORT", "11434")
	config.OllamaURL = "http://" + ollamaHost + ":" + ollamaPort

	return config, nil
}

// getEnv gets an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvAsBool gets an environment variable as boolean or returns a default value
func getEnvAsBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.ParseBool(value); err == nil {
			return parsed
		}
	}
	return defaultValue
}

// getEnvAsInt gets an environment variable as integer or returns a default value
func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil {
			return parsed
		}
	}
	return defaultValue
}

// MustString returns the string value for a given key path (for backward compatibility)
func (c *Config) MustString(key string) string {
	switch key {
	case "app.key":
		return c.App.Key
	case "app.mode":
		return c.App.Mode
	case "app.debug":
		return strconv.FormatBool(c.App.Debug)
	case "database.host":
		return c.Database.Host
	case "database.port":
		return strconv.Itoa(c.Database.Port)
	case "database.user":
		return c.Database.User
	case "database.password":
		return c.Database.Password
	case "database.name":
		return c.Database.Name
	case "database.debug":
		return strconv.FormatBool(c.Database.Debug)
	default:
		log.Fatalf("Unknown config key: %s", key)
		return ""
	}
}

// Exists checks if a configuration key exists
func (c *Config) Exists(key string) bool {
	switch key {
	case "app.key", "app.mode", "app.debug":
		return true
	case "database.host", "database.port", "database.user", "database.password", "database.name", "database.debug":
		return true
	default:
		return false
	}
}

// GetDebug returns debug mode for a given section
func (c *Config) GetDebug(section string) bool {
	switch section {
	case "app":
		return c.App.Debug
	case "database":
		return c.Database.Debug
	default:
		return false
	}
}
