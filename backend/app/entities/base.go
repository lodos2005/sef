package entities

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"gorm.io/gorm"
)

type Base struct {
	ID        uint           `json:"id" gorm:"primaryKey;autoIncrement"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"deleted_at" gorm:"index"`
}

type JSONB []interface{}

type SingleJSONB map[string]interface{}

// Value Marshal
func (a SingleJSONB) Value() (driver.Value, error) {
	return json.Marshal(a)
}

// Scan Unmarshal
func (a *SingleJSONB) Scan(value interface{}) error {
	if value == nil {
		*a = make(SingleJSONB)
		return nil
	}

	switch v := value.(type) {
	case []byte:
		if len(v) == 0 {
			*a = make(SingleJSONB)
			return nil
		}
		return json.Unmarshal(v, &a)
	case string:
		if v == "" {
			*a = make(SingleJSONB)
			return nil
		}
		return json.Unmarshal([]byte(v), &a)
	default:
		return fmt.Errorf("unsupported type for SingleJSONB: %T", value)
	}
}

// Value Marshal
func (a JSONB) Value() (driver.Value, error) {
	return json.Marshal(a)
}

// Scan Unmarshal
func (a *JSONB) Scan(value interface{}) error {
	if value == nil {
		*a = make(JSONB, 0)
		return nil
	}

	switch v := value.(type) {
	case []byte:
		if len(v) == 0 {
			*a = make(JSONB, 0)
			return nil
		}
		return json.Unmarshal(v, &a)
	case string:
		if v == "" {
			*a = make(JSONB, 0)
			return nil
		}
		return json.Unmarshal([]byte(v), &a)
	default:
		return fmt.Errorf("unsupported type for JSONB: %T", value)
	}
}
