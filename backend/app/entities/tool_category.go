package entities

type ToolCategory struct {
	Base
	Name        string `json:"name" gorm:"not null;unique;size:255"`
	DisplayName string `json:"display_name" gorm:"not null;size:255"`
	Description string `json:"description" gorm:"type:text"`
	Order       int    `json:"order" gorm:"default:0"` // For custom ordering
	Tools       []Tool `json:"tools,omitempty" gorm:"foreignKey:CategoryID"`
}
