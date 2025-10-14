package toolrunners

import (
	"context"
	"fmt"
)

// ToolCallContext provides additional context about the tool call being executed
type ToolCallContext struct {
	ToolCallID   string                 `json:"tool_call_id"`
	FunctionName string                 `json:"function_name"`
	ToolName     string                 `json:"tool_name"`
	Metadata     map[string]interface{} `json:"metadata,omitempty"`
}

// ToolRunner defines the interface for tool runners
type ToolRunner interface {
	// Execute runs the tool with given parameters
	Execute(ctx context.Context, parameters map[string]interface{}) (interface{}, error)
	// ExecuteWithContext runs the tool with given parameters and additional context
	ExecuteWithContext(ctx context.Context, parameters map[string]interface{}, toolContext *ToolCallContext) (interface{}, error)
	// ValidateParameters validates the input parameters against the tool's schema
	ValidateParameters(parameters map[string]interface{}) error
	// GetParameterSchema returns the JSON schema for tool parameters
	GetParameterSchema() map[string]interface{}
	// GetConfigSchema returns the JSON schema for tool configuration
	GetConfigSchema() map[string]interface{}
}

// ToolRunnerFactory creates tool runner instances
type ToolRunnerFactory struct{}

// NewToolRunner creates a new tool runner instance based on type
func (f *ToolRunnerFactory) NewToolRunner(toolType string, config map[string]interface{}, parameters interface{}) (ToolRunner, error) {
	switch toolType {
	case "api":
		return NewAPIToolRunner(config, parameters), nil
	case "web_search":
		return NewWebSearchToolRunner(), nil
	default:
		return nil, fmt.Errorf("unsupported tool type: %s", toolType)
	}
}

func (f *ToolRunnerFactory) SupportedTypes() []string {
	return []string{"api", "web_search"}
}
