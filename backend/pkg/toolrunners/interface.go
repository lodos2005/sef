package toolrunners

import (
	"context"
	"fmt"
)

// ToolRunner defines the interface for tool runners
type ToolRunner interface {
	// Execute runs the tool with given parameters
	Execute(ctx context.Context, parameters map[string]interface{}) (interface{}, error)
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
	default:
		return nil, fmt.Errorf("unsupported tool type: %s", toolType)
	}
}

func (f *ToolRunnerFactory) SupportedTypes() []string {
	return []string{"api"}
}
