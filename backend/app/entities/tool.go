package entities

type Tool struct {
	Base
	Name        string        `json:"name" gorm:"not null;size:255"`
	DisplayName string        `json:"display_name" gorm:"not null;size:255"`
	Description string        `json:"description" gorm:"type:text"`
	Type        string        `json:"type" gorm:"not null;size:50"`
	Config      SingleJSONB   `json:"config" gorm:"type:jsonb"`
	Parameters  JSONB         `json:"parameters" gorm:"type:jsonb"`
	CategoryID  *uint         `json:"category_id" gorm:"index"`
	Category    *ToolCategory `json:"category,omitempty" gorm:"foreignKey:CategoryID"`
	Chatbots    []Chatbot     `json:"chatbots,omitempty" gorm:"many2many:chatbot_tools;"`
}
