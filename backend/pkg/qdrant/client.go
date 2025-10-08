package qdrant

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// QdrantClient handles Qdrant vector database interactions
type QdrantClient struct {
	baseURL string
	client  *http.Client
}

// Point represents a vector point in Qdrant
type Point struct {
	ID      interface{}            `json:"id"`
	Vector  []float32              `json:"vector"`
	Payload map[string]interface{} `json:"payload,omitempty"`
}

// SearchResult represents a search result from Qdrant
type SearchResult struct {
	ID      interface{}            `json:"id"`
	Score   float32                `json:"score"`
	Payload map[string]interface{} `json:"payload"`
}

// CollectionInfo represents collection metadata
type CollectionInfo struct {
	Status string `json:"status"`
	Config struct {
		Params struct {
			VectorSize int    `json:"vectors.size"`
			Distance   string `json:"vectors.distance"`
		} `json:"params"`
	} `json:"config"`
}

// NewQdrantClient creates a new Qdrant client
func NewQdrantClient(baseURL string) *QdrantClient {
	if baseURL == "" {
		baseURL = "http://localhost:6333"
	}

	return &QdrantClient{
		baseURL: baseURL,
		client: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// CreateCollection creates a new collection in Qdrant
func (q *QdrantClient) CreateCollection(collectionName string, vectorSize int, distance string) error {
	if distance == "" {
		distance = "Cosine" // Default distance metric
	}

	payload := map[string]interface{}{
		"vectors": map[string]interface{}{
			"size":     vectorSize,
			"distance": distance,
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/collections/%s", q.baseURL, collectionName)
	req, err := http.NewRequest("PUT", url, bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := q.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to create collection: %s - %s", resp.Status, string(bodyBytes))
	}

	return nil
}

// CollectionExists checks if a collection exists
func (q *QdrantClient) CollectionExists(collectionName string) (bool, error) {
	url := fmt.Sprintf("%s/collections/%s", q.baseURL, collectionName)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return false, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := q.client.Do(req)
	if err != nil {
		return false, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK, nil
}

// DeleteCollection deletes a collection
func (q *QdrantClient) DeleteCollection(collectionName string) error {
	url := fmt.Sprintf("%s/collections/%s", q.baseURL, collectionName)
	req, err := http.NewRequest("DELETE", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := q.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to delete collection: %s - %s", resp.Status, string(bodyBytes))
	}

	return nil
}

// UpsertPoints inserts or updates points in a collection
func (q *QdrantClient) UpsertPoints(collectionName string, points []Point) error {
	payload := map[string]interface{}{
		"points": points,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/collections/%s/points", q.baseURL, collectionName)
	req, err := http.NewRequest("PUT", url, bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := q.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to upsert points: %s - %s", resp.Status, string(bodyBytes))
	}

	return nil
}

// Search performs a vector similarity search
func (q *QdrantClient) Search(collectionName string, vector []float32, limit int, filter map[string]interface{}) ([]SearchResult, error) {
	if limit == 0 {
		limit = 5
	}

	payload := map[string]interface{}{
		"vector": vector,
		"limit":  limit,
	}

	if filter != nil {
		payload["filter"] = filter
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/collections/%s/points/search", q.baseURL, collectionName)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := q.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to search: %s - %s", resp.Status, string(bodyBytes))
	}

	var response struct {
		Result []SearchResult `json:"result"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return response.Result, nil
}

// DeletePoints deletes points by filter
func (q *QdrantClient) DeletePoints(collectionName string, filter map[string]interface{}) error {
	payload := map[string]interface{}{
		"filter": filter,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/collections/%s/points/delete", q.baseURL, collectionName)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := q.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to delete points: %s - %s", resp.Status, string(bodyBytes))
	}

	return nil
}

// CountPoints returns the number of points in a collection
func (q *QdrantClient) CountPoints(collectionName string, filter map[string]interface{}) (int, error) {
	payload := map[string]interface{}{}
	if filter != nil {
		payload["filter"] = filter
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return 0, fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/collections/%s/points/count", q.baseURL, collectionName)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return 0, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := q.client.Do(req)
	if err != nil {
		return 0, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return 0, fmt.Errorf("failed to count points: %s - %s", resp.Status, string(bodyBytes))
	}

	var response struct {
		Result struct {
			Count int `json:"count"`
		} `json:"result"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return 0, fmt.Errorf("failed to decode response: %w", err)
	}

	return response.Result.Count, nil
}
