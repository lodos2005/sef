package entities

type Provider struct {
	Base
	Name        string `json:"name" gorm:"not null"`
	Type        string `json:"type" gorm:"not null"`
	Description string `json:"description"`
	BaseURL     string `json:"base_url" gorm:"not null"`
}
