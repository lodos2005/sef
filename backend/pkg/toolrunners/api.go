package toolrunners

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// APIToolRunner implements the ToolRunner interface for API calls
type APIToolRunner struct {
	config     map[string]interface{}
	parameters []interface{}
}

// NewAPIToolRunner creates a new API tool runner
func NewAPIToolRunner(config map[string]interface{}, parameters interface{}) *APIToolRunner {
	var params []interface{}
	if parameters != nil {
		if p, ok := parameters.([]interface{}); ok {
			params = p
		}
	}
	return &APIToolRunner{
		config:     config,
		parameters: params,
	}
}

// Execute runs the API tool with given parameters (backward compatibility)
func (r *APIToolRunner) Execute(ctx context.Context, parameters map[string]interface{}) (interface{}, error) {
	return r.ExecuteWithContext(ctx, parameters, nil)
}

// ExecuteWithContext runs the API tool with given parameters and additional context
func (r *APIToolRunner) ExecuteWithContext(ctx context.Context, parameters map[string]interface{}, toolContext *ToolCallContext) (interface{}, error) {
	// Extract configuration
	method, ok := r.config["method"].(string)
	if !ok {
		method = "GET"
	}

	url, ok := r.config["url"].(string)
	if !ok {
		return nil, fmt.Errorf("url is required in tool configuration")
	}

	headers, _ := r.config["headers"].(map[string]interface{})
	timeout := 30 * time.Second
	if timeoutVal, ok := r.config["timeout"].(float64); ok {
		timeout = time.Duration(timeoutVal) * time.Second
	}

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: timeout,
	}

	var reqBody io.Reader
	if method == "POST" || method == "PUT" || method == "PATCH" {
		if bodyStr, ok := parameters["body"].(string); ok && bodyStr != "" {
			reqBody = strings.NewReader(bodyStr)
		}
	}

	// Create request
	req, err := http.NewRequestWithContext(ctx, method, url, reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	for key, value := range headers {
		if strVal, ok := value.(string); ok {
			req.Header.Set(key, strVal)
		}
	}

	// Execute request
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Parse JSON response
	var result interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		// If not JSON, return as string
		result = string(body)
	}

	// Build tool call details
	toolCallDetails := map[string]interface{}{
		"tool_type":   "api",
		"method":      method,
		"url":         url,
		"parameters":  parameters,
		"executed_at": time.Now().UTC().Format(time.RFC3339),
	}

	// Add tool context information if provided
	if toolContext != nil {
		if toolContext.ToolCallID != "" {
			toolCallDetails["tool_call_id"] = toolContext.ToolCallID
		}
		if toolContext.FunctionName != "" {
			toolCallDetails["function_name"] = toolContext.FunctionName
		}
		if toolContext.ToolName != "" {
			toolCallDetails["tool_name"] = toolContext.ToolName
		}
		if toolContext.Metadata != nil {
			toolCallDetails["metadata"] = toolContext.Metadata
		}
	}

	// Return detailed result with tool call information
	return map[string]interface{}{
		"tool_call_details": toolCallDetails,
		"status_code":       resp.StatusCode,
		"body":              result,
	}, nil
}

// ValidateParameters validates the input parameters against the tool's schema
func (r *APIToolRunner) ValidateParameters(parameters map[string]interface{}) error {
	if parameters == nil {
		return fmt.Errorf("parameters cannot be nil")
	}

	schema := r.GetParameterSchema()
	if properties, ok := schema["properties"].(map[string]interface{}); ok {
		for paramName, paramDef := range properties {
			if paramDefMap, ok := paramDef.(map[string]interface{}); ok {
				if err := r.validateParameterType(paramName, parameters[paramName], paramDefMap); err != nil {
					return err
				}
			}
		}
	}

	// Check required parameters
	if required, ok := schema["required"].([]interface{}); ok {
		for _, reqParam := range required {
			if reqParamStr, ok := reqParam.(string); ok {
				if _, exists := parameters[reqParamStr]; !exists {
					return fmt.Errorf("parameter '%s' is required", reqParamStr)
				}
			}
		}
	}

	return nil
}

// validateParameterType validates a single parameter against its type definition
func (r *APIToolRunner) validateParameterType(paramName string, value interface{}, paramDef map[string]interface{}) error {
	paramType, ok := paramDef["type"].(string)
	if !ok {
		// If no type specified, skip validation
		return nil
	}

	if value == nil {
		// Check if parameter is required by looking at the schema's required array
		// This is handled in ValidateParameters, so we can skip here
		return nil
	}

	switch paramType {
	case "string":
		if _, ok := value.(string); !ok {
			return fmt.Errorf("parameter '%s' must be a string", paramName)
		}
	case "number":
		switch value.(type) {
		case float64, int, int32, int64:
			// Valid number types
		default:
			return fmt.Errorf("parameter '%s' must be a number", paramName)
		}
	case "integer":
		switch v := value.(type) {
		case int, int32, int64:
			// Valid integer types
		case float64:
			// Check if it's a whole number
			if v != float64(int64(v)) {
				return fmt.Errorf("parameter '%s' must be an integer", paramName)
			}
		default:
			return fmt.Errorf("parameter '%s' must be an integer", paramName)
		}
	case "boolean":
		if _, ok := value.(bool); !ok {
			return fmt.Errorf("parameter '%s' must be a boolean", paramName)
		}
	case "object":
		if _, ok := value.(map[string]interface{}); !ok {
			return fmt.Errorf("parameter '%s' must be an object", paramName)
		}
	case "array":
		if _, ok := value.([]interface{}); !ok {
			return fmt.Errorf("parameter '%s' must be an array", paramName)
		}
	default:
		// Unknown type, allow it
		return nil
	}

	return nil
}

// GetParameterSchema returns the JSON schema for tool parameters
func (r *APIToolRunner) GetParameterSchema() map[string]interface{} {
	if len(r.parameters) > 0 {
		// Convert parameters array to JSON schema
		properties := make(map[string]interface{})
		required := []string{}

		for _, param := range r.parameters {
			if paramMap, ok := param.(map[string]interface{}); ok {
				name, nameOk := paramMap["name"].(string)
				paramType, typeOk := paramMap["type"].(string)
				description, descOk := paramMap["description"].(string)
				req, reqOk := paramMap["required"].(bool)

				if nameOk && typeOk {
					prop := map[string]interface{}{
						"type": paramType,
					}
					if descOk && description != "" {
						prop["description"] = description
					}
					properties[name] = prop

					if reqOk && req {
						required = append(required, name)
					}
				}
			}
		}

		return map[string]interface{}{
			"type":       "object",
			"properties": properties,
			"required":   required,
		}
	}
	// Fallback to default schema if no parameters defined
	return map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"body": map[string]interface{}{
				"type":        "string",
				"description": "Request body (JSON string for POST/PUT/PATCH)",
				"format":      "json",
			},
		},
	}
}

// GetConfigSchema returns the JSON schema for tool configuration
func (r *APIToolRunner) GetConfigSchema() map[string]interface{} {
	return map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"url": map[string]interface{}{
				"type":        "string",
				"description": "The API endpoint URL to call",
				"format":      "uri",
			},
			"method": map[string]interface{}{
				"type":        "string",
				"description": "HTTP method for the request",
				"enum":        []string{"GET", "POST", "PUT", "PATCH", "DELETE"},
				"default":     "GET",
			},
			"headers": map[string]interface{}{
				"type":        "object",
				"description": "HTTP headers as key-value pairs",
				"additionalProperties": map[string]interface{}{
					"type": "string",
				},
			},
			"timeout": map[string]interface{}{
				"type":        "integer",
				"description": "Request timeout in seconds",
				"minimum":     1,
				"maximum":     300,
				"default":     30,
			},
		},
		"required": []string{"url"},
	}
}
