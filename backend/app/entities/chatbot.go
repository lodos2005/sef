package entities

type Chatbot struct {
	Base
	Name         string     `json:"name" gorm:"not null;size:255"`
	Description  string     `json:"description" gorm:"type:text"`
	ProviderID   uint       `json:"provider_id" gorm:"not null"`
	Provider     Provider   `json:"provider,omitempty" gorm:"foreignKey:ProviderID"`
	SystemPrompt string     `json:"system_prompt" gorm:"type:text"`
	ModelName    string     `json:"model_name" gorm:"not null"`
	Sessions     []Session  `json:"sessions,omitempty" gorm:"foreignKey:ChatbotID"`
	Tools        []Tool     `json:"tools,omitempty" gorm:"many2many:chatbot_tools;"`
	Documents    []Document `json:"documents,omitempty" gorm:"many2many:chatbot_documents;"`
}
