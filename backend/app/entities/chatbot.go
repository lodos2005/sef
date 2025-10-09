package entities

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
)

type StringArray []string

func (a *StringArray) Scan(value interface{}) error {
	if value == nil {
		*a = []string{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}

	return json.Unmarshal(bytes, a)
}

func (a StringArray) Value() (driver.Value, error) {
	if a == nil {
		return "[]", nil
	}
	return json.Marshal(a)
}

type Chatbot struct {
	Base
	Name              string      `json:"name" gorm:"not null;size:255"`
	Description       string      `json:"description" gorm:"type:text"`
	ProviderID        uint        `json:"provider_id" gorm:"not null"`
	Provider          Provider    `json:"provider,omitempty" gorm:"foreignKey:ProviderID"`
	SystemPrompt      string      `json:"system_prompt" gorm:"type:text"`
	ModelName         string      `json:"model_name" gorm:"not null"`
	PromptSuggestions StringArray `json:"prompt_suggestions" gorm:"type:json"`
	Sessions          []Session   `json:"sessions,omitempty" gorm:"foreignKey:ChatbotID"`
	Tools             []Tool      `json:"tools,omitempty" gorm:"many2many:chatbot_tools;"`
	Documents         []Document  `json:"documents,omitempty" gorm:"many2many:chatbot_documents;"`
}

// GetPromptSuggestions returns the prompt suggestions, or default ones if none are set
func (c *Chatbot) GetPromptSuggestions() []string {
	if len(c.PromptSuggestions) > 0 {
		return c.PromptSuggestions
	}

	// Default suggestions
	return []string{
		"What can you help me with?",
		"Explain this concept to me",
		"How do I get started?",
	}
}
