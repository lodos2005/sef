package toolrunners

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3/log"
)

// WebSearchToolRunner implements the ToolRunner interface for web search
type WebSearchToolRunner struct {
	searxngURL string
}

// NewWebSearchToolRunner creates a new web search tool runner
func NewWebSearchToolRunner() *WebSearchToolRunner {
	searxngURL := os.Getenv("SEARXNG_URL")
	if searxngURL == "" {
		// Check if we're in development (local) or production (Docker)
		// In Docker, APP_ENV is usually set to "production"
		appEnv := os.Getenv("APP_ENV")
		if appEnv == "production" {
			searxngURL = "http://searxng:8080" // Docker service name
		} else {
			searxngURL = "http://localhost:8888" // Local development
		}
	}

	log.Infof("Web search tool initialized with SearXNG URL: %s", searxngURL)

	return &WebSearchToolRunner{
		searxngURL: searxngURL,
	}
}

// Execute runs the web search tool with given parameters
func (r *WebSearchToolRunner) Execute(ctx context.Context, parameters map[string]interface{}) (interface{}, error) {
	return r.ExecuteWithContext(ctx, parameters, nil)
}

// ExecuteWithContext runs the web search tool with given parameters and additional context
func (r *WebSearchToolRunner) ExecuteWithContext(ctx context.Context, parameters map[string]interface{}, toolContext *ToolCallContext) (interface{}, error) {
	// Extract query parameter
	query, ok := parameters["query"].(string)
	if !ok || query == "" {
		return nil, fmt.Errorf("query parameter is required and must be a string")
	}

	// Extract optional parameters
	numResults := 5
	if num, ok := parameters["num_results"].(float64); ok {
		numResults = int(num)
	}

	// Build SearXNG API URL
	searchURL := fmt.Sprintf("%s/search", r.searxngURL)
	params := url.Values{}
	params.Add("q", query)
	params.Add("format", "json")
	params.Add("categories", "general")

	fullURL := fmt.Sprintf("%s?%s", searchURL, params.Encode())

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Create request
	req, err := http.NewRequestWithContext(ctx, "GET", fullURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create search request: %w", err)
	}

	// Execute request
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute search request: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read search response: %w", err)
	}

	// Parse SearXNG response
	var searchResponse struct {
		Query   string `json:"query"`
		Results []struct {
			Title   string `json:"title"`
			URL     string `json:"url"`
			Content string `json:"content"`
			Engine  string `json:"engine"`
		} `json:"results"`
	}

	if err := json.Unmarshal(body, &searchResponse); err != nil {
		return nil, fmt.Errorf("failed to parse search response: %w", err)
	}

	// Format results for LLM
	var formattedResults []map[string]string
	maxResults := numResults
	if len(searchResponse.Results) < maxResults {
		maxResults = len(searchResponse.Results)
	}

	for i := 0; i < maxResults; i++ {
		result := searchResponse.Results[i]
		formattedResults = append(formattedResults, map[string]string{
			"title":   result.Title,
			"url":     result.URL,
			"snippet": result.Content,
		})
	}

	// Create formatted response
	response := map[string]interface{}{
		"query":   query,
		"results": formattedResults,
	}

	// Also create a text summary for the LLM
	var summary strings.Builder
	summary.WriteString(fmt.Sprintf("Web search results for '%s':\n\n", query))
	for i, result := range formattedResults {
		summary.WriteString(fmt.Sprintf("%d. %s\n", i+1, result["title"]))
		summary.WriteString(fmt.Sprintf("   URL: %s\n", result["url"]))
		if result["snippet"] != "" {
			summary.WriteString(fmt.Sprintf("   %s\n", result["snippet"]))
		}
		summary.WriteString("\n")
	}

	response["summary"] = summary.String()

	log.Infof("Web search completed for query: %s, found %d results", query, len(formattedResults))

	return response, nil
}

// ValidateParameters validates the input parameters
func (r *WebSearchToolRunner) ValidateParameters(parameters map[string]interface{}) error {
	if _, ok := parameters["query"]; !ok {
		return fmt.Errorf("query parameter is required")
	}

	if query, ok := parameters["query"].(string); !ok || query == "" {
		return fmt.Errorf("query must be a non-empty string")
	}

	return nil
}

// GetParameterSchema returns the JSON schema for tool parameters
func (r *WebSearchToolRunner) GetParameterSchema() map[string]interface{} {
	return map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"query": map[string]interface{}{
				"type":        "string",
				"description": "The search query to execute",
			},
			"num_results": map[string]interface{}{
				"type":        "number",
				"description": "Number of search results to return (default: 5)",
				"default":     5,
			},
		},
		"required": []string{"query"},
	}
}

// GetConfigSchema returns the JSON schema for tool configuration
func (r *WebSearchToolRunner) GetConfigSchema() map[string]interface{} {
	return map[string]interface{}{
		"type":       "object",
		"properties": map[string]interface{}{},
		"required":   []string{},
	}
}
