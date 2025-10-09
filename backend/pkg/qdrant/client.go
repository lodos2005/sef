package qdrant

import (
	"context"
	"fmt"
	"hash/fnv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gofiber/fiber/v3/log"
	"github.com/qdrant/go-client/qdrant"
)

// QdrantClient wraps the official Qdrant Go client
type QdrantClient struct {
	client *qdrant.Client
}

// Point represents a vector point in Qdrant (kept for backward compatibility)
type Point struct {
	ID      interface{}            `json:"id"`
	Vector  []float32              `json:"vector"`
	Payload map[string]interface{} `json:"payload,omitempty"`
}

// SearchResult represents a search result from Qdrant (kept for backward compatibility)
type SearchResult struct {
	ID      interface{}            `json:"id"`
	Score   float32                `json:"score"`
	Payload map[string]interface{} `json:"payload"`
}

// NewQdrantClient creates a new Qdrant client
func NewQdrantClient(baseURL string) *QdrantClient {
	if baseURL == "" {
		baseURL = "http://localhost:6333"
	}

	// Parse host and port from baseURL
	host := "localhost"
	port := 6334 // gRPC port (not REST port 6333)

	// Remove http:// or https:// prefix
	baseURL = strings.TrimPrefix(baseURL, "http://")
	baseURL = strings.TrimPrefix(baseURL, "https://")

	// Split host and port if provided
	parts := strings.Split(baseURL, ":")
	if len(parts) > 0 && parts[0] != "" {
		host = parts[0]
	}
	if len(parts) > 1 {
		// Qdrant Go client uses gRPC port (6334) not REST port (6333)
		// If REST port 6333 is specified, convert to gRPC port 6334
		if parts[1] == "6333" {
			port = 6334
		} else {
			fmt.Sscanf(parts[1], "%d", &port)
		}
	}

	log.Infof("Connecting to Qdrant at %s:%d", host, port)
	client, err := qdrant.NewClient(&qdrant.Config{
		Host: host,
		Port: port,
	})

	if err != nil {
		panic(fmt.Sprintf("failed to create Qdrant client: %v", err))
	}

	return &QdrantClient{
		client: client,
	}
}

// CreateCollection creates a new collection in Qdrant
func (q *QdrantClient) CreateCollection(collectionName string, vectorSize int, distance string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	log.Infof("Creating Qdrant collection '%s' with vector size %d", collectionName, vectorSize)

	// Map distance string to Qdrant distance enum
	var distanceMetric qdrant.Distance
	switch strings.ToLower(distance) {
	case "cosine":
		distanceMetric = qdrant.Distance_Cosine
	case "euclid", "euclidean":
		distanceMetric = qdrant.Distance_Euclid
	case "dot":
		distanceMetric = qdrant.Distance_Dot
	default:
		distanceMetric = qdrant.Distance_Cosine
	}

	err := q.client.CreateCollection(ctx, &qdrant.CreateCollection{
		CollectionName: collectionName,
		VectorsConfig: qdrant.NewVectorsConfig(&qdrant.VectorParams{
			Size:     uint64(vectorSize),
			Distance: distanceMetric,
		}),
	})

	if err != nil {
		log.Errorf("Failed to create collection '%s': %v", collectionName, err)
		return err
	}

	log.Infof("Successfully created collection '%s'", collectionName)
	return nil
}

// CollectionExists checks if a collection exists
func (q *QdrantClient) CollectionExists(collectionName string) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	log.Infof("Checking if Qdrant collection '%s' exists", collectionName)

	exists, err := q.client.CollectionExists(ctx, collectionName)
	if err != nil {
		log.Errorf("Failed to check if collection '%s' exists: %v", collectionName, err)
		return false, err
	}

	log.Infof("Collection '%s' exists: %v", collectionName, exists)
	return exists, nil
}

// DeleteCollection deletes a collection
func (q *QdrantClient) DeleteCollection(collectionName string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	err := q.client.DeleteCollection(ctx, collectionName)
	return err
}

// sanitizeUTF8 removes invalid UTF-8 characters from a string
func sanitizeUTF8(s string) string {
	if utf8.ValidString(s) {
		return s
	}

	// Convert to valid UTF-8 by replacing invalid sequences
	v := make([]rune, 0, len(s))
	for i, r := range s {
		if r == utf8.RuneError {
			_, size := utf8.DecodeRuneInString(s[i:])
			if size == 1 {
				// Invalid UTF-8 sequence, skip it
				continue
			}
		}
		v = append(v, r)
	}
	return string(v)
}

// hashStringToUint64 converts a string to a uint64 using FNV-1a hash
func hashStringToUint64(s string) uint64 {
	h := fnv.New64a()
	h.Write([]byte(s))
	return h.Sum64()
}

// UpsertPoints inserts or updates points in a collection
func (q *QdrantClient) UpsertPoints(collectionName string, points []Point) (err error) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// Recover from panics and convert to errors
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("panic in UpsertPoints: %v", r)
			log.Errorf("Panic in UpsertPoints: %v", r)
		}
	}()

	// Convert our Point type to Qdrant PointStruct
	qdrantPoints := make([]*qdrant.PointStruct, len(points))
	for i, point := range points {
		// Convert ID to appropriate type
		var pointID *qdrant.PointId
		switch v := point.ID.(type) {
		case string:
			// For string IDs, we need to convert to a numeric ID
			// since Qdrant only supports UUID or numeric IDs
			// We'll hash the string to get a consistent numeric ID
			pointID = qdrant.NewIDNum(hashStringToUint64(v))
		case int:
			pointID = qdrant.NewIDNum(uint64(v))
		case uint64:
			pointID = qdrant.NewIDNum(v)
		case int64:
			pointID = qdrant.NewIDNum(uint64(v))
		default:
			// Convert to string and hash
			strID := fmt.Sprintf("%v", v)
			pointID = qdrant.NewIDNum(hashStringToUint64(strID))
		}

		// Sanitize payload to ensure all values are compatible with NewValueMap
		// NewValueMap can panic on certain types, so we need to ensure compatibility
		sanitizedPayload := make(map[string]interface{})
		for key, value := range point.Payload {
			if value == nil {
				log.Debugf("Skipping nil value for key: %s", key)
				continue // Skip nil values
			}

			// Ensure value is of a supported type
			switch v := value.(type) {
			case string:
				// Sanitize string to ensure valid UTF-8
				sanitizedPayload[key] = sanitizeUTF8(v)
			case bool, int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, float32, float64:
				sanitizedPayload[key] = v
			case []interface{}, map[string]interface{}:
				sanitizedPayload[key] = v
			default:
				// Convert unsupported types to string and sanitize
				log.Debugf("Converting unsupported type %T to string for key: %s", value, key)
				sanitizedPayload[key] = sanitizeUTF8(fmt.Sprintf("%v", value))
			}
		}

		qdrantPoints[i] = &qdrant.PointStruct{
			Id:      pointID,
			Vectors: qdrant.NewVectors(point.Vector...),
			Payload: qdrant.NewValueMap(sanitizedPayload),
		}
	}

	_, err = q.client.Upsert(ctx, &qdrant.UpsertPoints{
		CollectionName: collectionName,
		Points:         qdrantPoints,
	})

	return err
}

// Search performs a vector similarity search
func (q *QdrantClient) Search(collectionName string, vector []float32, limit int, filter map[string]interface{}) ([]SearchResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if limit == 0 {
		limit = 5
	}

	// Build the query
	queryPoints := &qdrant.QueryPoints{
		CollectionName: collectionName,
		Query:          qdrant.NewQuery(vector...),
		Limit:          qdrant.PtrOf(uint64(limit)),
		WithPayload:    qdrant.NewWithPayload(true),
	}

	// Add filter if provided
	if filter != nil {
		qdrantFilter := convertFilter(filter)
		if qdrantFilter != nil {
			queryPoints.Filter = qdrantFilter
		}
	}

	searchResult, err := q.client.Query(ctx, queryPoints)
	if err != nil {
		return nil, fmt.Errorf("failed to search: %w", err)
	}

	// Convert results to our SearchResult type
	results := make([]SearchResult, len(searchResult))
	for i, point := range searchResult {
		// Extract ID
		var id interface{}
		if point.Id.GetNum() != 0 {
			id = point.Id.GetNum()
		} else {
			id = point.Id.GetUuid()
		}

		// Convert payload
		payload := make(map[string]interface{})
		if point.Payload != nil {
			payload = convertPayloadToMap(point.Payload)
		}

		results[i] = SearchResult{
			ID:      id,
			Score:   point.Score,
			Payload: payload,
		}
	}

	return results, nil
}

// DeletePoints deletes points by filter
func (q *QdrantClient) DeletePoints(collectionName string, filter map[string]interface{}) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	qdrantFilter := convertFilter(filter)
	if qdrantFilter == nil {
		return fmt.Errorf("invalid filter provided")
	}

	_, err := q.client.Delete(ctx, &qdrant.DeletePoints{
		CollectionName: collectionName,
		Points: &qdrant.PointsSelector{
			PointsSelectorOneOf: &qdrant.PointsSelector_Filter{
				Filter: qdrantFilter,
			},
		},
	})

	return err
}

// CountPoints returns the number of points in a collection
func (q *QdrantClient) CountPoints(collectionName string, filter map[string]interface{}) (int, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	countRequest := &qdrant.CountPoints{
		CollectionName: collectionName,
	}

	// Add filter if provided
	if filter != nil {
		qdrantFilter := convertFilter(filter)
		if qdrantFilter != nil {
			countRequest.Filter = qdrantFilter
		}
	}

	countResult, err := q.client.Count(ctx, countRequest)
	if err != nil {
		return 0, fmt.Errorf("failed to count points: %w", err)
	}

	return int(countResult), nil
}

// convertFilter converts a generic filter map to Qdrant Filter
func convertFilter(filter map[string]interface{}) *qdrant.Filter {
	if filter == nil {
		return nil
	}

	qdrantFilter := &qdrant.Filter{}

	// Handle "must" conditions
	if must, ok := filter["must"].([]map[string]interface{}); ok {
		for _, condition := range must {
			if key, hasKey := condition["key"].(string); hasKey {
				if match, hasMatch := condition["match"].(map[string]interface{}); hasMatch {
					if value, hasValue := match["value"]; hasValue {
						// Use appropriate NewMatch* function based on value type
						switch v := value.(type) {
						case string:
							qdrantFilter.Must = append(qdrantFilter.Must, qdrant.NewMatchKeyword(key, v))
						case int:
							qdrantFilter.Must = append(qdrantFilter.Must, qdrant.NewMatchInt(key, int64(v)))
						case int64:
							qdrantFilter.Must = append(qdrantFilter.Must, qdrant.NewMatchInt(key, v))
						case uint:
							qdrantFilter.Must = append(qdrantFilter.Must, qdrant.NewMatchInt(key, int64(v)))
						case bool:
							qdrantFilter.Must = append(qdrantFilter.Must, qdrant.NewMatchBool(key, v))
						default:
							// Fallback: convert to string and use keyword match
							qdrantFilter.Must = append(qdrantFilter.Must, qdrant.NewMatchKeyword(key, fmt.Sprintf("%v", v)))
						}
					}
				}
			}
		}
	}

	// Handle "should" conditions
	if should, ok := filter["should"].([]map[string]interface{}); ok {
		for _, condition := range should {
			if key, hasKey := condition["key"].(string); hasKey {
				if match, hasMatch := condition["match"].(map[string]interface{}); hasMatch {
					if value, hasValue := match["value"]; hasValue {
						// Use appropriate NewMatch* function based on value type
						switch v := value.(type) {
						case string:
							qdrantFilter.Should = append(qdrantFilter.Should, qdrant.NewMatchKeyword(key, v))
						case int:
							qdrantFilter.Should = append(qdrantFilter.Should, qdrant.NewMatchInt(key, int64(v)))
						case int64:
							qdrantFilter.Should = append(qdrantFilter.Should, qdrant.NewMatchInt(key, v))
						case uint:
							qdrantFilter.Should = append(qdrantFilter.Should, qdrant.NewMatchInt(key, int64(v)))
						case bool:
							qdrantFilter.Should = append(qdrantFilter.Should, qdrant.NewMatchBool(key, v))
						default:
							// Fallback: convert to string and use keyword match
							qdrantFilter.Should = append(qdrantFilter.Should, qdrant.NewMatchKeyword(key, fmt.Sprintf("%v", v)))
						}
					}
				}
			}
		}
	}

	return qdrantFilter
}

// convertPayloadToMap converts Qdrant payload to map[string]interface{}
func convertPayloadToMap(payload map[string]*qdrant.Value) map[string]interface{} {
	result := make(map[string]interface{})

	for key, value := range payload {
		result[key] = convertValue(value)
	}

	return result
}

// convertValue converts a Qdrant Value to Go interface{}
func convertValue(value *qdrant.Value) interface{} {
	if value == nil {
		return nil
	}

	switch v := value.Kind.(type) {
	case *qdrant.Value_IntegerValue:
		return v.IntegerValue
	case *qdrant.Value_DoubleValue:
		return v.DoubleValue
	case *qdrant.Value_StringValue:
		return v.StringValue
	case *qdrant.Value_BoolValue:
		return v.BoolValue
	case *qdrant.Value_ListValue:
		list := make([]interface{}, len(v.ListValue.Values))
		for i, item := range v.ListValue.Values {
			list[i] = convertValue(item)
		}
		return list
	case *qdrant.Value_StructValue:
		return convertPayloadToMap(v.StructValue.Fields)
	default:
		return nil
	}
}
