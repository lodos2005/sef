package entities

type Provider struct {
	Base
	Name        string `json:"name" gorm:"not null"`
	Type        string `json:"type" gorm:"not null"` // ollama, openai, etc.
	Description string `json:"description"`
	IsActive    bool   `json:"is_active" gorm:"default:true"`
	Config      string `json:"config" gorm:"type:text"` // JSON config
}
