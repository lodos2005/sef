package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"sef/app/entities"
	"sef/internal/paginator"
	"sef/internal/search"
	"sef/pkg/importservice"
	"sef/pkg/providers"
	"sef/pkg/toolrunners"
	"strings"

	"github.com/gofiber/fiber/v3"
	"gopkg.in/yaml.v3"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Controller struct {
	DB *gorm.DB
}

func (h *Controller) Index(c fiber.Ctx) error {
	var items []*entities.Tool
	db := h.DB.Model(&entities.Tool{}).Preload(clause.Associations)

	if c.Query("search") != "" {
		search.Search(c.Query("search"), db)
	}

	page, err := paginator.New(db, c).Paginate(&items)
	if err != nil {
		return err
	}

	return c.JSON(page)
}

func (h *Controller) Show(c fiber.Ctx) error {
	var item *entities.Tool
	if err := h.DB.Preload(clause.Associations).First(&item, c.Params("id")).Error; err != nil {
		return err
	}

	return c.JSON(item)
}

func (h *Controller) Create(c fiber.Ctx) error {
	var payload *entities.Tool
	if err := c.Bind().JSON(&payload); err != nil {
		return err
	}

	// Validate tool type
	if payload.Type == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "tool type is required"})
	}

	// Validate tool runner exists
	factory := &toolrunners.ToolRunnerFactory{}
	if _, err := factory.NewToolRunner(payload.Type, payload.Config, payload.Parameters); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if err := h.DB.
		Clauses(clause.Returning{}).
		Create(&payload).Error; err != nil {
		return err
	}

	return c.JSON(payload)
}

func (h *Controller) Update(c fiber.Ctx) error {
	var payload *entities.Tool
	if err := c.Bind().JSON(&payload); err != nil {
		return err
	}

	var tool *entities.Tool
	if err := h.DB.First(&tool, c.Params("id")).Error; err != nil {
		return err
	}

	// Validate tool type if it's being updated
	if payload.Type != "" {
		factory := &toolrunners.ToolRunnerFactory{}
		if _, err := factory.NewToolRunner(payload.Type, payload.Config, payload.Parameters); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
	}

	if err := h.DB.
		Clauses(clause.Returning{}).
		Model(&entities.Tool{}).
		Where("id = ?", c.Params("id")).
		Updates(&payload).Error; err != nil {
		return err
	}

	return c.JSON(payload)
}

func (h *Controller) Delete(c fiber.Ctx) error {
	if err := h.DB.Delete(&entities.Tool{}, c.Params("id")).Error; err != nil {
		return err
	}

	return c.JSON(fiber.Map{"message": "Tool deleted successfully"})
}

func (h *Controller) Types(c fiber.Ctx) error {
	// For now, hardcoded list of supported tool types
	// In the future, this could be dynamic based on available tool runners
	factory := &toolrunners.ToolRunnerFactory{}
	return c.JSON(fiber.Map{"types": factory.SupportedTypes()})
}

func (h *Controller) Schema(c fiber.Ctx) error {
	toolType := c.Query("type")
	if toolType == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "type query parameter is required"})
	}

	// Create tool runner to get schema
	factory := &toolrunners.ToolRunnerFactory{}
	runner, err := factory.NewToolRunner(toolType, map[string]interface{}{}, map[string]interface{}{})
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	schema := runner.GetConfigSchema()
	return c.JSON(fiber.Map{"schema": schema})
}

func (h *Controller) Import(c fiber.Ctx) error {
	// Get the uploaded file
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "no file uploaded"})
	}

	// Check file extension
	filename := strings.ToLower(file.Filename)
	if !strings.HasSuffix(filename, ".json") && !strings.HasSuffix(filename, ".yaml") && !strings.HasSuffix(filename, ".yml") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "only JSON, YAML, and YML files are supported"})
	}

	// Open and read the file
	fileReader, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to open file"})
	}
	defer fileReader.Close()

	fileData, err := io.ReadAll(fileReader)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to read file"})
	}

	// Create import service and process the file
	importService := importservice.NewImportService()
	var result *importservice.ImportResult

	// Determine file format and call appropriate import method
	if strings.HasSuffix(filename, ".yaml") || strings.HasSuffix(filename, ".yml") {
		result, err = importService.ImportFromYAML(fileData)
	} else {
		result, err = importService.ImportFromJSON(fileData)
	}

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// If import failed, return the errors
	if !result.Success {
		return c.Status(fiber.StatusBadRequest).JSON(result)
	}

	// Save the imported tools to database
	var savedTools []entities.Tool
	var saveErrors []string

	for _, tool := range result.Tools {
		// Validate tool type
		factory := &toolrunners.ToolRunnerFactory{}
		if _, err := factory.NewToolRunner(tool.Type, map[string]interface{}(tool.Config), tool.Parameters); err != nil {
			saveErrors = append(saveErrors, fmt.Sprintf("failed to validate tool '%s': %v", tool.Name, err))
			continue
		}

		// Check if tool with same name already exists
		var existingTool entities.Tool
		if err := h.DB.Where("name = ?", tool.Name).First(&existingTool).Error; err == nil {
			// Tool exists, skip or update based on query parameter
			if c.Query("update_existing") == "true" {
				// Update existing tool
				if err := h.DB.Model(&existingTool).Updates(&tool).Error; err != nil {
					saveErrors = append(saveErrors, fmt.Sprintf("failed to update tool '%s': %v", tool.Name, err))
					continue
				}
				savedTools = append(savedTools, existingTool)
			} else {
				saveErrors = append(saveErrors, fmt.Sprintf("tool '%s' already exists (use update_existing=true to overwrite)", tool.Name))
				continue
			}
		} else {
			// Create new tool
			if err := h.DB.Create(&tool).Error; err != nil {
				saveErrors = append(saveErrors, fmt.Sprintf("failed to save tool '%s': %v", tool.Name, err))
				continue
			}
			savedTools = append(savedTools, tool)
		}
	}

	// Return the result
	return c.JSON(fiber.Map{
		"success":        len(saveErrors) == 0,
		"imported_count": len(savedTools),
		"total_count":    len(result.Tools),
		"tools":          savedTools,
		"errors":         append(result.Errors, saveErrors...),
	})
}

func (h *Controller) Test(c fiber.Ctx) error {
	var payload struct {
		Parameters map[string]interface{} `json:"parameters"`
	}
	if err := c.Bind().JSON(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Get the tool
	var tool entities.Tool
	if err := h.DB.First(&tool, c.Params("id")).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Tool not found"})
	}

	// Create tool runner
	factory := &toolrunners.ToolRunnerFactory{}
	runner, err := factory.NewToolRunner(tool.Type, tool.Config, tool.Parameters)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fmt.Sprintf("Failed to create tool runner: %v", err)})
	}

	// Validate parameters
	if err := runner.ValidateParameters(payload.Parameters); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fmt.Sprintf("Parameter validation failed: %v", err)})
	}

	// Execute the tool
	ctx := context.Background()
	result, err := runner.Execute(ctx, payload.Parameters)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fmt.Sprintf("Tool execution failed: %v", err)})
	}

	return c.JSON(result)
}

func (h *Controller) TestJq(c fiber.Ctx) error {
	var payload struct {
		Data       interface{}            `json:"data"`
		Query      string                 `json:"query"`
		Parameters map[string]interface{} `json:"parameters,omitempty"`
	}
	if err := c.Bind().JSON(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if payload.Query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "query is required"})
	}

	// Create a temporary API tool runner to use the jq filter method
	runner := &toolrunners.APIToolRunner{}
	filteredResult, err := runner.ApplyJqFilter(payload.Data, payload.Query, payload.Parameters)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fmt.Sprintf("JQ query failed: %v", err)})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"result":  filteredResult,
	})
}

func (h *Controller) GenerateJq(c fiber.Ctx) error {
	var payload struct {
		Data          interface{}            `json:"data"`
		Description   string                 `json:"description"`
		ProviderID    uint                   `json:"provider_id"`
		Model         string                 `json:"model"`
		ExistingQuery string                 `json:"existing_query,omitempty"`
		Parameters    map[string]interface{} `json:"parameters,omitempty"`
	}
	if err := c.Bind().JSON(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if payload.Description == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "description is required"})
	}

	if payload.ProviderID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "provider_id is required"})
	}

	if payload.Model == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "model is required"})
	}

	// Get the provider
	var provider *entities.Provider
	if err := h.DB.First(&provider, payload.ProviderID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Provider not found"})
	}

	// Create provider instance
	factory := &providers.ProviderFactory{}
	config := map[string]interface{}{
		"base_url": provider.BaseURL,
	}

	llmProvider, err := factory.NewProvider(provider.Type, config)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	// Prepare the prompt for JQ query generation
	dataStr := "No sample data provided"
	if payload.Data != nil {
		dataBytes, _ := json.MarshalIndent(payload.Data, "", "  ")
		dataStr = string(dataBytes)
	}

	paramsStr := "No parameters provided"
	if payload.Parameters != nil {
		paramsBytes, _ := json.MarshalIndent(payload.Parameters, "", "  ")
		paramsStr = string(paramsBytes)
	}

	prompt := fmt.Sprintf(`You are an expert at writing JQ queries. Given the following JSON data, user description, and available parameters, generate a JQ query that extracts the requested information.

JSON Data:
%s

User Description: %s

Available Parameters: %s
You can use these parameters as variables in your JQ query (e.g., $param_name for filtering).

Please provide only the JQ query without any explanation or markdown formatting. The query should be valid JQ syntax.`, dataStr, payload.Description, paramsStr)

	if payload.ExistingQuery != "" {
		prompt = fmt.Sprintf(`You are an expert at writing JQ queries. Given the following JSON data, user description, existing JQ query, and available parameters, generate an improved JQ query that extracts the requested information while respecting the existing query.

JSON Data:
%s

User Description: %s

Existing Query: %s

Available Parameters: %s
You can use these parameters as variables in your JQ query (e.g., $param_name for filtering).

Please provide only the JQ query without any explanation or markdown formatting. The query should be valid JQ syntax.`, dataStr, payload.Description, payload.ExistingQuery, paramsStr)
	}

	// Generate the JQ query using the LLM
	messages := []providers.ChatMessage{
		{Role: "user", Content: prompt},
	}

	options := map[string]interface{}{
		"model": payload.Model,
	}

	resultChan, err := llmProvider.GenerateChat(context.Background(), messages, options)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fmt.Sprintf("Failed to generate JQ query: %v", err)})
	}

	var generatedQuery strings.Builder
	for chunk := range resultChan {
		generatedQuery.WriteString(chunk)
	}

	query := strings.TrimSpace(generatedQuery.String())

	response := fiber.Map{
		"success": true,
		"query":   query,
	}
	if payload.ExistingQuery != "" {
		response["existing_query"] = payload.ExistingQuery
	}

	return c.JSON(response)
}

func (h *Controller) Export(c fiber.Ctx) error {
	var payload struct {
		ToolIDs []uint `json:"tool_ids"`
		Format  string `json:"format"`
	}
	if err := c.Bind().JSON(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if len(payload.ToolIDs) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "tool_ids is required"})
	}

	// Default format is JSON
	if payload.Format == "" {
		payload.Format = "json"
	}

	// Validate format
	if payload.Format != "json" && payload.Format != "yaml" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "format must be 'json' or 'yaml'"})
	}

	// Get the tools
	var tools []entities.Tool
	if err := h.DB.Where("id IN ?", payload.ToolIDs).Find(&tools).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch tools"})
	}

	if len(tools) == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "No tools found with the provided IDs"})
	}

	// Convert tools to OpenAPI 3.0 format
	openAPISpec := h.convertToolsToOpenAPI(tools)

	var exportBytes []byte
	var err error
	var contentType string
	var filename string

	if payload.Format == "yaml" {
		exportBytes, err = yaml.Marshal(openAPISpec)
		contentType = "application/x-yaml"
		filename = "tools_export.yaml"
	} else {
		exportBytes, err = json.MarshalIndent(openAPISpec, "", "  ")
		contentType = "application/json"
		filename = "tools_export.json"
	}

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fmt.Sprintf("Failed to marshal tools: %v", err)})
	}

	c.Set("Content-Type", contentType)
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	return c.Send(exportBytes)
}

// convertToolsToOpenAPI converts tools to OpenAPI 3.0 specification format
func (h *Controller) convertToolsToOpenAPI(tools []entities.Tool) map[string]interface{} {
	paths := make(map[string]interface{})
	serversMap := make(map[string]bool) // Track unique server URLs

	for _, tool := range tools {
		if tool.Type != "api" {
			continue // Only API tools can be exported as OpenAPI
		}

		// Extract URL and method from config
		url, _ := tool.Config["url"].(string)
		method, _ := tool.Config["method"].(string)
		if url == "" || method == "" {
			continue
		}

		// Parse URL to extract path and base URL
		parsedURL := strings.Split(url, "?")[0] // Remove query params
		pathPart := "/"
		serverURL := ""

		// Try to extract path and server URL
		if strings.Contains(parsedURL, "://") {
			parts := strings.SplitN(parsedURL, "://", 2)
			if len(parts) == 2 {
				protocol := parts[0]
				hostAndPath := parts[1]
				pathStart := strings.Index(hostAndPath, "/")
				if pathStart >= 0 {
					pathPart = hostAndPath[pathStart:]
					serverURL = protocol + "://" + hostAndPath[:pathStart]
				} else {
					// No path, just host
					serverURL = protocol + "://" + hostAndPath
					pathPart = "/"
				}
				// Track this server URL
				if serverURL != "" {
					serversMap[serverURL] = true
				}
			}
		}

		// Build operation
		operation := make(map[string]interface{})
		operation["summary"] = tool.DisplayName
		operation["description"] = tool.Description
		operation["operationId"] = tool.Name

		// Add tags based on display name (if contains "/")
		if strings.Contains(tool.DisplayName, "/") {
			parts := strings.Split(tool.DisplayName, "/")
			operation["tags"] = []string{strings.TrimSpace(parts[0])}
		}

		// Convert parameters
		var parameters []map[string]interface{}
		var bodyParam map[string]interface{}

		if len(tool.Parameters) > 0 {
			for _, paramInterface := range tool.Parameters {
				param, ok := paramInterface.(map[string]interface{})
				if !ok {
					continue
				}

				paramName, _ := param["name"].(string)
				paramType, _ := param["type"].(string)
				paramDesc, _ := param["description"].(string)
				paramRequired, _ := param["required"].(bool)

				// Handle body parameter separately
				if paramName == "body" {
					bodyParam = map[string]interface{}{
						"description": paramDesc,
						"required":    paramRequired,
						"content": map[string]interface{}{
							"application/json": map[string]interface{}{
								"schema": map[string]interface{}{
									"type": "object",
								},
							},
						},
					}
					continue
				}

				// Determine parameter location
				paramLocation := "query"
				if strings.Contains(url, "{"+paramName+"}") {
					paramLocation = "path"
				}

				openAPIParam := map[string]interface{}{
					"name":        paramName,
					"in":          paramLocation,
					"description": paramDesc,
					"required":    paramRequired,
					"schema": map[string]interface{}{
						"type": paramType,
					},
				}
				parameters = append(parameters, openAPIParam)
			}
		}

		if len(parameters) > 0 {
			operation["parameters"] = parameters
		}

		// Add request body if exists
		if bodyParam != nil {
			operation["requestBody"] = bodyParam
		}

		// Add responses
		operation["responses"] = map[string]interface{}{
			"200": map[string]interface{}{
				"description": "Successful response",
				"content": map[string]interface{}{
					"application/json": map[string]interface{}{
						"schema": map[string]interface{}{
							"type": "object",
						},
					},
				},
			},
		}

		// Get or create path item
		var pathItem map[string]interface{}
		if existing, ok := paths[pathPart]; ok {
			pathItem = existing.(map[string]interface{})
		} else {
			pathItem = make(map[string]interface{})
			paths[pathPart] = pathItem
		}

		// Add operation to path
		pathItem[strings.ToLower(method)] = operation
	}

	// Build servers list from collected server URLs
	servers := make([]map[string]interface{}, 0)
	for serverURL := range serversMap {
		servers = append(servers, map[string]interface{}{
			"url": serverURL,
		})
	}

	// If no servers found, add a default placeholder
	if len(servers) == 0 {
		servers = append(servers, map[string]interface{}{
			"url":         "https://api.example.com",
			"description": "Default server (update with your actual API URL)",
		})
	}

	// Build OpenAPI spec
	spec := map[string]interface{}{
		"openapi": "3.0.0",
		"info": map[string]interface{}{
			"title":       "Exported Tools",
			"description": fmt.Sprintf("OpenAPI specification generated from %d exported tool(s)", len(tools)),
			"version":     "1.0.0",
		},
		"servers": servers,
		"paths":   paths,
	}

	return spec
}
