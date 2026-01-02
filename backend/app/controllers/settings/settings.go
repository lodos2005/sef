package settings

import (
	"fmt"
	"sef/app/entities"
	"sef/pkg/providers"
	"strconv"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

type Controller struct {
	DB *gorm.DB
}

// GetEmbeddingConfig returns current embedding configuration
func (h *Controller) GetEmbeddingConfig(c fiber.Ctx) error {
	var providerSetting entities.Settings
	var modelSetting entities.Settings
	var vectorSizeSetting entities.Settings

	// Get provider
	var provider *entities.Provider
	if err := h.DB.Where("key = ?", "embedding_provider_id").First(&providerSetting).Error; err == nil {
		h.DB.First(&provider, providerSetting.Value)
	}

	// Get model
	h.DB.Where("key = ?", "embedding_model").First(&modelSetting)

	// Get vector size
	h.DB.Where("key = ?", "embedding_vector_size").First(&vectorSizeSetting)

	return c.JSON(fiber.Map{
		"provider":    provider,
		"model":       modelSetting.Value,
		"vector_size": vectorSizeSetting.Value,
	})
}

// UpdateEmbeddingConfig updates embedding configuration (admin only)
func (h *Controller) UpdateEmbeddingConfig(c fiber.Ctx) error {
	var payload struct {
		ProviderID uint   `json:"provider_id"`
		Model      string `json:"model"`
		VectorSize int    `json:"vector_size"`
	}

	if err := c.Bind().JSON(&payload); err != nil {
		return err
	}

	// Validate provider exists and is Ollama type
	var provider entities.Provider
	if err := h.DB.First(&provider, payload.ProviderID).Error; err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Provider not found")
	}

	// Save provider setting
	h.DB.Where("key = ?", "embedding_provider_id").
		Assign(entities.Settings{Key: "embedding_provider_id", Value: fmt.Sprintf("%d", payload.ProviderID)}).
		FirstOrCreate(&entities.Settings{})

	// Save model setting
	h.DB.Where("key = ?", "embedding_model").
		Assign(entities.Settings{Key: "embedding_model", Value: payload.Model}).
		FirstOrCreate(&entities.Settings{})

	// Save vector size setting
	h.DB.Where("key = ?", "embedding_vector_size").
		Assign(entities.Settings{Key: "embedding_vector_size", Value: fmt.Sprintf("%d", payload.VectorSize)}).
		FirstOrCreate(&entities.Settings{})

	return c.JSON(fiber.Map{
		"message":     "Embedding configuration updated",
		"provider_id": payload.ProviderID,
		"model":       payload.Model,
		"vector_size": payload.VectorSize,
	})
}

// ListEmbeddingModels returns available embedding models from configured provider
func (h *Controller) ListEmbeddingModels(c fiber.Ctx) error {
	providerIDStr := c.Params("provider_id")
	if providerIDStr == "" {
		return fiber.NewError(fiber.StatusBadRequest, "Provider ID required")
	}

	providerID, err := strconv.ParseUint(providerIDStr, 10, 32)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid provider ID")
	}

	var provider entities.Provider
	if err := h.DB.First(&provider, uint(providerID)).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Provider not found")
	}

	// Create embedding provider factory
	factory := &providers.EmbeddingProviderFactory{}
	config := map[string]interface{}{
		"base_url": provider.BaseURL,
		"api_key":  provider.ApiKey,
	}

	embedProvider, err := factory.NewProvider(provider.Type, config)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, fmt.Sprintf("Failed to create provider: %v", err))
	}

	// Get all models
	allModels, err := embedProvider.ListModels()
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, fmt.Sprintf("Failed to list models: %v", err))
	}

	// Filter embedding models
	// Known embedding models
	embeddingModels := []string{}
	embeddingKeywords := []string{"embed", "embedding", "nomic", "mxbai", "minilm", "bge", "gte"}

	for _, model := range allModels {
		isEmbeddingModel := false
		modelLower := toLower(model)

		for _, keyword := range embeddingKeywords {
			if contains(modelLower, keyword) {
				isEmbeddingModel = true
				break
			}
		}

		if isEmbeddingModel {
			embeddingModels = append(embeddingModels, model)
		}
	}

	// Known vector sizes for common models
	modelInfo := []map[string]interface{}{}
	for _, model := range embeddingModels {
		vectorSize := getVectorSize(model)
		modelInfo = append(modelInfo, map[string]interface{}{
			"name":        model,
			"vector_size": vectorSize,
		})
	}

	return c.JSON(fiber.Map{
		"models": modelInfo,
	})
}

// Helper functions
func toLower(s string) string {
	result := ""
	for _, r := range s {
		if r >= 'A' && r <= 'Z' {
			result += string(r + 32)
		} else {
			result += string(r)
		}
	}
	return result
}

func contains(s, substr string) bool {
	if len(substr) == 0 {
		return true
	}
	if len(substr) > len(s) {
		return false
	}
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func getVectorSize(modelName string) int {
	modelLower := toLower(modelName)

	// Known vector sizes
	if contains(modelLower, "nomic-embed-text") {
		return 768
	}
	if contains(modelLower, "mxbai-embed-large") {
		return 1024
	}
	if contains(modelLower, "all-minilm") {
		return 384
	}
	if contains(modelLower, "bge-large") {
		return 1024
	}
	if contains(modelLower, "bge-base") {
		return 768
	}
	if contains(modelLower, "bge-small") {
		return 384
	}
	if contains(modelLower, "gte-large") {
		return 1024
	}
	if contains(modelLower, "gte-base") {
		return 768
	}

	// Default
	return 768
}
