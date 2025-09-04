package entities

type Chatbot struct {
	Base
	Name         string    `json:"name" gorm:"not null;size:255"`
	Description  string    `json:"description" gorm:"type:text"`
	ProviderID   uint      `json:"provider_id" gorm:"not null"`
	Provider     Provider  `json:"provider,omitempty" gorm:"foreignKey:ProviderID"`
	UserID       uint      `json:"user_id" gorm:"not null"`
	User         User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
	SystemPrompt string    `json:"-" gorm:"type:text"`
	ModelName    string    `json:"model_name" gorm:"not null"`
	Sessions     []Session `json:"sessions,omitempty" gorm:"foreignKey:ChatbotID"`
}
