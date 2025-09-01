package entities

type Chatbot struct {
	Base
	Name         string        `json:"name" gorm:"not null;size:255"`
	Description  string        `json:"description" gorm:"type:text"`
	ProviderID   uint          `json:"provider_id" gorm:"not null"`
	Provider     Provider      `json:"provider,omitempty" gorm:"foreignKey:ProviderID"`
	UserID       uint          `json:"user_id" gorm:"not null"` // Creator of the chatbot
	User         User          `json:"user,omitempty" gorm:"foreignKey:UserID"`
	IsActive     bool          `json:"is_active" gorm:"default:true"`
	IsPublic     bool          `json:"is_public" gorm:"default:false"` // Can be used by other users
	SystemPrompt string        `json:"system_prompt" gorm:"type:text"`
	Config       string        `json:"config" gorm:"type:text"` // JSON config for the chatbot
	Tools        []Tool        `json:"tools,omitempty" gorm:"many2many:chatbot_tools;"`
	ChatSessions []ChatSession `json:"chat_sessions,omitempty" gorm:"foreignKey:ChatbotID"`
}

type Tool struct {
	Base
	Name        string `json:"name" gorm:"not null;size:255"`
	Description string `json:"description" gorm:"type:text"`
	Type        string `json:"type" gorm:"not null;size:50"` // builtin, custom_script, api_call
	Script      string `json:"script" gorm:"type:text"`      // For custom scripts
	Config      string `json:"config" gorm:"type:text"`      // JSON config for the tool
	IsActive    bool   `json:"is_active" gorm:"default:true"`
}
