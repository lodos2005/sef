package importservice

import (
	"encoding/json"
	"fmt"
	"net/url"
	"sef/app/entities"
	"strings"

	"gopkg.in/yaml.v3"
)

// ImportService handles importing tools from various formats
type ImportService struct{}

// ImportResult contains the result of an import operation
type ImportResult struct {
	Success       bool            `json:"success"`
	ImportedCount int             `json:"imported_count"`
	Tools         []entities.Tool `json:"tools"`
	Errors        []string        `json:"errors,omitempty"`
}

// PostmanCollection represents a Postman collection structure
type PostmanCollection struct {
	Info struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Schema      string `json:"schema"`
	} `json:"info"`
	Item []PostmanItem `json:"item"`
}

// PostmanItem represents a Postman request item
type PostmanItem struct {
	Name        string         `json:"name"`
	Description string         `json:"description,omitempty"`
	Request     PostmanRequest `json:"request"`
	Item        []PostmanItem  `json:"item,omitempty"`
}

// PostmanRequest represents a Postman request
type PostmanRequest struct {
	Method string          `json:"method"`
	Header []PostmanHeader `json:"header,omitempty"`
	Body   PostmanBody     `json:"body,omitempty"`
	URL    PostmanURL      `json:"url"`
}

// PostmanHeader represents a Postman header
type PostmanHeader struct {
	Key   string `json:"key"`
	Value string `json:"value"`
	Type  string `json:"type,omitempty"`
}

// PostmanBody represents a Postman request body
type PostmanBody struct {
	Mode string `json:"mode"`
	Raw  string `json:"raw,omitempty"`
}

// PostmanURL represents a Postman URL
type PostmanURL struct {
	Raw   string   `json:"raw"`
	Host  []string `json:"host,omitempty"`
	Path  []string `json:"path,omitempty"`
	Query []struct {
		Key   string `json:"key"`
		Value string `json:"value"`
	} `json:"query,omitempty"`
}

// OpenAPISpec represents an OpenAPI specification
type OpenAPISpec struct {
	OpenAPI string                 `json:"openapi" yaml:"openapi"`
	Info    OpenAPIInfo            `json:"info" yaml:"info"`
	Servers []OpenAPIServer        `json:"servers,omitempty" yaml:"servers,omitempty"`
	Paths   map[string]interface{} `json:"paths" yaml:"paths"`
}

// OpenAPIInfo represents OpenAPI info section
type OpenAPIInfo struct {
	Title       string `json:"title" yaml:"title"`
	Description string `json:"description,omitempty" yaml:"description,omitempty"`
	Version     string `json:"version" yaml:"version"`
}

// OpenAPIServer represents an OpenAPI server
type OpenAPIServer struct {
	URL         string `json:"url" yaml:"url"`
	Description string `json:"description,omitempty" yaml:"description,omitempty"`
}

// OpenAPIOperation represents an API operation
type OpenAPIOperation struct {
	Summary     string             `json:"summary,omitempty" yaml:"summary,omitempty"`
	Description string             `json:"description,omitempty" yaml:"description,omitempty"`
	OperationID string             `json:"operationId,omitempty" yaml:"operationId,omitempty"`
	Parameters  []OpenAPIParameter `json:"parameters,omitempty" yaml:"parameters,omitempty"`
	RequestBody OpenAPIRequestBody `json:"requestBody,omitempty" yaml:"requestBody,omitempty"`
	Tags        []string           `json:"tags,omitempty" yaml:"tags,omitempty"`
}

// OpenAPIParameter represents an API parameter
type OpenAPIParameter struct {
	Name        string                 `json:"name" yaml:"name"`
	In          string                 `json:"in" yaml:"in"`
	Description string                 `json:"description,omitempty" yaml:"description,omitempty"`
	Required    bool                   `json:"required,omitempty" yaml:"required,omitempty"`
	Schema      map[string]interface{} `json:"schema,omitempty" yaml:"schema,omitempty"`
}

// OpenAPIRequestBody represents a request body
type OpenAPIRequestBody struct {
	Description string                      `json:"description,omitempty" yaml:"description,omitempty"`
	Required    bool                        `json:"required,omitempty" yaml:"required,omitempty"`
	Content     map[string]OpenAPIMediaType `json:"content,omitempty" yaml:"content,omitempty"`
}

// OpenAPIMediaType represents a media type
type OpenAPIMediaType struct {
	Schema map[string]interface{} `json:"schema,omitempty" yaml:"schema,omitempty"`
}

// NewImportService creates a new import service instance
func NewImportService() *ImportService {
	return &ImportService{}
}

// ImportFromJSON imports tools from JSON data
func (s *ImportService) ImportFromJSON(jsonData []byte) (*ImportResult, error) {
	return s.importFromData(jsonData, "json")
}

// ImportFromYAML imports tools from YAML data
func (s *ImportService) ImportFromYAML(yamlData []byte) (*ImportResult, error) {
	return s.importFromData(yamlData, "yaml")
}

// importFromData imports tools from JSON or YAML data
func (s *ImportService) importFromData(data []byte, format string) (*ImportResult, error) {
	var generic map[string]interface{}
	var err error

	if format == "yaml" {
		err = yaml.Unmarshal(data, &generic)
	} else {
		err = json.Unmarshal(data, &generic)
	}

	if err != nil {
		return &ImportResult{
			Success: false,
			Errors:  []string{fmt.Sprintf("invalid %s: %v", strings.ToUpper(format), err)},
		}, nil
	}

	// Check if it's a Postman collection
	if info, hasInfo := generic["info"]; hasInfo {
		if infoMap, ok := info.(map[string]interface{}); ok {
			if schema, hasSchema := infoMap["schema"]; hasSchema {
				if schemaStr, ok := schema.(string); ok && strings.Contains(schemaStr, "postman") {
					return s.importFromPostman(data, format)
				}
			}
		}
		if _, hasItem := generic["item"]; hasItem {
			return s.importFromPostman(data, format)
		}
	}

	// Check if it's an OpenAPI specification
	if openapi, hasOpenAPI := generic["openapi"]; hasOpenAPI {
		if _, ok := openapi.(string); ok {
			return s.importFromOpenAPI(data, format)
		}
	}

	// Check for Swagger 2.0
	if swagger, hasSwagger := generic["swagger"]; hasSwagger {
		if swaggerStr, ok := swagger.(string); ok && strings.HasPrefix(swaggerStr, "2.") {
			return s.importFromSwagger(data, format)
		}
	}

	return &ImportResult{
		Success: false,
		Errors:  []string{fmt.Sprintf("unsupported format - only Postman collections and OpenAPI/Swagger specifications are supported in %s format", strings.ToUpper(format))},
	}, nil
}

// importFromPostman imports tools from Postman collection
func (s *ImportService) importFromPostman(data []byte, format string) (*ImportResult, error) {
	var collection PostmanCollection
	var err error

	if format == "yaml" {
		err = yaml.Unmarshal(data, &collection)
	} else {
		err = json.Unmarshal(data, &collection)
	}

	if err != nil {
		return &ImportResult{
			Success: false,
			Errors:  []string{fmt.Sprintf("failed to parse Postman collection: %v", err)},
		}, nil
	}

	var tools []entities.Tool
	var errors []string

	s.extractPostmanItems(collection.Item, "", &tools, &errors)

	return &ImportResult{
		Success:       len(errors) == 0,
		ImportedCount: len(tools),
		Tools:         tools,
		Errors:        errors,
	}, nil
}

// extractPostmanItems recursively extracts tools from Postman items
func (s *ImportService) extractPostmanItems(items []PostmanItem, prefix string, tools *[]entities.Tool, errors *[]string) {
	for _, item := range items {
		if len(item.Item) > 0 {
			folderPrefix := item.Name
			if prefix != "" {
				folderPrefix = prefix + "/" + item.Name
			}
			s.extractPostmanItems(item.Item, folderPrefix, tools, errors)
			continue
		}

		tool, err := s.convertPostmanRequestToTool(item, prefix)
		if err != nil {
			*errors = append(*errors, fmt.Sprintf("failed to convert request '%s': %v", item.Name, err))
			continue
		}

		*tools = append(*tools, *tool)
	}
}

// convertPostmanRequestToTool converts a Postman request to a Tool entity
func (s *ImportService) convertPostmanRequestToTool(item PostmanItem, prefix string) (*entities.Tool, error) {
	name := s.sanitizeName(item.Name)
	if prefix != "" {
		name = s.sanitizeName(prefix) + "_" + name
	}

	displayName := item.Name
	if prefix != "" {
		displayName = prefix + " / " + item.Name
	}

	urlStr := item.Request.URL.Raw
	if urlStr == "" && len(item.Request.URL.Host) > 0 && len(item.Request.URL.Path) > 0 {
		urlStr = "https://" + strings.Join(item.Request.URL.Host, ".") + "/" + strings.Join(item.Request.URL.Path, "/")
	}

	if _, err := url.Parse(urlStr); err != nil {
		return nil, fmt.Errorf("invalid URL: %s", urlStr)
	}

	headers := make(map[string]interface{})
	for _, header := range item.Request.Header {
		if header.Key != "" && header.Value != "" {
			headers[header.Key] = header.Value
		}
	}

	config := map[string]interface{}{
		"url":    urlStr,
		"method": strings.ToUpper(item.Request.Method),
	}
	if len(headers) > 0 {
		config["headers"] = headers
	}

	var parameters []interface{}

	for _, query := range item.Request.URL.Query {
		if query.Key != "" {
			parameters = append(parameters, map[string]interface{}{
				"name":        query.Key,
				"type":        "string",
				"description": fmt.Sprintf("Query parameter: %s", query.Key),
				"required":    false,
			})
		}
	}

	if strings.Contains("POST PUT PATCH", item.Request.Method) {
		parameters = append(parameters, map[string]interface{}{
			"name":        "body",
			"type":        "string",
			"description": "Request body (JSON string)",
			"required":    false,
		})
	}

	return &entities.Tool{
		Name:        name,
		DisplayName: displayName,
		Description: s.buildDescription(item, urlStr),
		Type:        "api",
		Config:      entities.SingleJSONB(config),
		Parameters:  entities.JSONB(parameters),
	}, nil
}

// importFromOpenAPI imports tools from OpenAPI specification
func (s *ImportService) importFromOpenAPI(data []byte, format string) (*ImportResult, error) {
	var spec OpenAPISpec
	var err error

	if format == "yaml" {
		err = yaml.Unmarshal(data, &spec)
	} else {
		err = json.Unmarshal(data, &spec)
	}

	if err != nil {
		return &ImportResult{
			Success: false,
			Errors:  []string{fmt.Sprintf("failed to parse OpenAPI specification: %v", err)},
		}, nil
	}

	var tools []entities.Tool
	var errors []string

	baseURL := ""
	if len(spec.Servers) > 0 {
		baseURL = spec.Servers[0].URL
	}

	for path, pathItemInterface := range spec.Paths {
		pathItem, ok := pathItemInterface.(map[string]interface{})
		if !ok {
			continue
		}

		for method, operationInterface := range pathItem {
			if !isHTTPMethod(method) {
				continue
			}

			operation, err := s.convertToOpenAPIOperation(operationInterface)
			if err != nil {
				errors = append(errors, fmt.Sprintf("failed to parse operation %s %s: %v", strings.ToUpper(method), path, err))
				continue
			}

			tool, err := s.convertOpenAPIOperationToTool(spec.Info.Title, path, method, *operation, baseURL)
			if err != nil {
				errors = append(errors, fmt.Sprintf("failed to convert operation %s %s: %v", strings.ToUpper(method), path, err))
				continue
			}
			tools = append(tools, *tool)
		}
	}

	return &ImportResult{
		Success:       len(errors) == 0,
		ImportedCount: len(tools),
		Tools:         tools,
		Errors:        errors,
	}, nil
}

// convertOpenAPIOperationToTool converts an OpenAPI operation to a Tool entity
func (s *ImportService) convertOpenAPIOperationToTool(apiTitle, path, method string, operation OpenAPIOperation, baseURL string) (*entities.Tool, error) {
	name := s.sanitizeName(operation.OperationID)
	if name == "" {
		name = s.sanitizeName(apiTitle) + "_" + s.sanitizeName(method) + "_" + s.sanitizeName(path)
	}

	displayName := operation.Summary
	if displayName == "" {
		displayName = strings.ToUpper(method) + " " + path
	}

	if len(operation.Tags) > 0 {
		displayName = operation.Tags[0] + " / " + displayName
	}

	fullURL := baseURL + path
	if baseURL == "" {
		fullURL = "https://api.example.com" + path
	}

	config := map[string]interface{}{
		"url":    fullURL,
		"method": strings.ToUpper(method),
	}

	var parameters []interface{}

	for _, param := range operation.Parameters {
		paramType := "string"
		if param.Schema != nil {
			if schemaType, ok := param.Schema["type"].(string); ok {
				paramType = schemaType
			}
		}

		parameters = append(parameters, map[string]interface{}{
			"name":        param.Name,
			"type":        paramType,
			"description": param.Description,
			"required":    param.Required,
		})
	}

	if len(operation.RequestBody.Content) > 0 {
		// Build detailed description from schema
		description := operation.RequestBody.Description
		for contentType, mediaType := range operation.RequestBody.Content {
			if strings.Contains(contentType, "json") {
				schema := mediaType.Schema
				if schemaType, ok := schema["type"].(string); ok && schemaType == "object" {
					if props, ok := schema["properties"].(map[string]interface{}); ok {
						description += "\n\nRequest Body Schema (JSON):\n"
						var requiredFields []string
						if req, ok := schema["required"].([]interface{}); ok {
							for _, r := range req {
								if s, ok := r.(string); ok {
									requiredFields = append(requiredFields, s)
								}
							}
						}
						for propName, propSchemaInterface := range props {
							if propSchema, ok := propSchemaInterface.(map[string]interface{}); ok {
								required := false
								for _, rf := range requiredFields {
									if rf == propName {
										required = true
										break
									}
								}
								reqStr := ""
								if required {
									reqStr = " (required)"
								}
								description += fmt.Sprintf("- %s: %s%s\n", propName, propSchema["type"], reqStr)
								if desc, ok := propSchema["description"].(string); ok && desc != "" {
									description += fmt.Sprintf("  Description: %s\n", desc)
								}
								if example, ok := propSchema["example"]; ok {
									description += fmt.Sprintf("  Example: %v\n", example)
								}
								// Handle nested objects like labels
								if nestedProps, ok := propSchema["properties"].(map[string]interface{}); ok {
									description += "  Properties:\n"
									for nestedName, nestedSchemaInterface := range nestedProps {
										if nestedSchema, ok := nestedSchemaInterface.(map[string]interface{}); ok {
											description += fmt.Sprintf("    - %s: %s\n", nestedName, nestedSchema["type"])
											if nestedExample, ok := nestedSchema["example"]; ok {
												description += fmt.Sprintf("      Example: %v\n", nestedExample)
											}
										}
									}
								}
							}
						}
						if examples, ok := schema["examples"].(map[string]interface{}); ok {
							description += "\nExamples:\n"
							for exampleName, exampleValue := range examples {
								description += fmt.Sprintf("- %s: %v\n", exampleName, exampleValue)
							}
						}
					}
				}
			}
		}
		parameters = append(parameters, map[string]interface{}{
			"name":        "body",
			"type":        "string",
			"description": description,
			"required":    operation.RequestBody.Required,
		})
	}

	description := operation.Description
	if description == "" {
		description = operation.Summary
	}
	if description == "" {
		description = fmt.Sprintf("API endpoint: %s %s", strings.ToUpper(method), path)
	}

	return &entities.Tool{
		Name:        name,
		DisplayName: displayName,
		Description: description,
		Type:        "api",
		Config:      entities.SingleJSONB(config),
		Parameters:  entities.JSONB(parameters),
	}, nil
}

// importFromSwagger imports tools from Swagger 2.0 specification
func (s *ImportService) importFromSwagger(data []byte, format string) (*ImportResult, error) {
	return &ImportResult{
		Success: false,
		Errors:  []string{fmt.Sprintf("Swagger 2.0 support is not yet implemented - please convert to OpenAPI 3.0 format (%s)", strings.ToUpper(format))},
	}, nil
}

// sanitizeName converts a string to a valid tool name
func (s *ImportService) sanitizeName(input string) string {
	name := strings.ReplaceAll(input, " ", "_")
	name = strings.ReplaceAll(name, "-", "_")
	name = strings.ReplaceAll(name, ".", "_")
	name = strings.ReplaceAll(name, "/", "_")
	name = strings.ReplaceAll(name, "\\", "_")
	name = strings.ReplaceAll(name, "{", "")
	name = strings.ReplaceAll(name, "}", "")

	var result strings.Builder
	for _, char := range name {
		if char >= 'a' && char <= 'z' || char >= 'A' && char <= 'Z' || char >= '0' && char <= '9' || char == '_' {
			result.WriteRune(char)
		}
	}

	name = result.String()

	if len(name) > 0 && name[0] >= '0' && name[0] <= '9' {
		name = "tool_" + name
	}

	if name == "" {
		name = "imported_tool"
	}

	return strings.ToLower(name)
}

// buildDescription builds a description for a Postman request
func (s *ImportService) buildDescription(item PostmanItem, url string) string {
	desc := item.Description
	if desc == "" {
		desc = fmt.Sprintf("API endpoint: %s %s", strings.ToUpper(item.Request.Method), url)
	}
	return desc
}

// isHTTPMethod checks if a method is a valid HTTP method
func isHTTPMethod(method string) bool {
	httpMethods := []string{"get", "post", "put", "patch", "delete", "head", "options", "trace"}
	method = strings.ToLower(method)
	for _, m := range httpMethods {
		if method == m {
			return true
		}
	}
	return false
}

// convertToOpenAPIOperation converts an interface{} to OpenAPIOperation
func (s *ImportService) convertToOpenAPIOperation(operationInterface interface{}) (*OpenAPIOperation, error) {
	if operationMap, ok := operationInterface.(map[string]interface{}); ok {
		operation := &OpenAPIOperation{}

		if summary, ok := operationMap["summary"].(string); ok {
			operation.Summary = summary
		}
		if description, ok := operationMap["description"].(string); ok {
			operation.Description = description
		}
		if operationID, ok := operationMap["operationId"].(string); ok {
			operation.OperationID = operationID
		}

		if paramsInterface, ok := operationMap["parameters"]; ok {
			if paramsList, ok := paramsInterface.([]interface{}); ok {
				for _, paramInterface := range paramsList {
					if paramMap, ok := paramInterface.(map[string]interface{}); ok {
						param := OpenAPIParameter{}
						if name, ok := paramMap["name"].(string); ok {
							param.Name = name
						}
						if in, ok := paramMap["in"].(string); ok {
							param.In = in
						}
						if desc, ok := paramMap["description"].(string); ok {
							param.Description = desc
						}
						if required, ok := paramMap["required"].(bool); ok {
							param.Required = required
						}
						if schema, ok := paramMap["schema"].(map[string]interface{}); ok {
							param.Schema = schema
						}
						operation.Parameters = append(operation.Parameters, param)
					}
				}
			}
		}

		if requestBodyInterface, ok := operationMap["requestBody"]; ok {
			if requestBodyMap, ok := requestBodyInterface.(map[string]interface{}); ok {
				requestBody := OpenAPIRequestBody{}
				if desc, ok := requestBodyMap["description"].(string); ok {
					requestBody.Description = desc
				}
				if required, ok := requestBodyMap["required"].(bool); ok {
					requestBody.Required = required
				}
				if content, ok := requestBodyMap["content"].(map[string]interface{}); ok {
					requestBody.Content = make(map[string]OpenAPIMediaType)
					for contentType, mediaTypeInterface := range content {
						if mediaTypeMap, ok := mediaTypeInterface.(map[string]interface{}); ok {
							mediaType := OpenAPIMediaType{}
							if schema, ok := mediaTypeMap["schema"].(map[string]interface{}); ok {
								mediaType.Schema = schema
							}
							requestBody.Content[contentType] = mediaType
						}
					}
				}
				operation.RequestBody = requestBody
			}
		}

		if tagsInterface, ok := operationMap["tags"]; ok {
			if tagsList, ok := tagsInterface.([]interface{}); ok {
				for _, tagInterface := range tagsList {
					if tag, ok := tagInterface.(string); ok {
						operation.Tags = append(operation.Tags, tag)
					}
				}
			}
		}

		return operation, nil
	}

	return nil, fmt.Errorf("operation is not a valid map structure")
}
