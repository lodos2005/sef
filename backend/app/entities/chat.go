package entities

type ChatSession struct {
	Base
	UserID    uint      `json:"user_id" gorm:"not null"`
	ChatbotID uint      `json:"chatbot_id" gorm:"not null"`
	Title     string    `json:"title" gorm:"size:255"`
	IsActive  bool      `json:"is_active" gorm:"default:true"`
	User      User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Chatbot   Chatbot   `json:"chatbot,omitempty" gorm:"foreignKey:ChatbotID"`
	Messages  []Message `json:"messages,omitempty" gorm:"foreignKey:SessionID"`
}

type Message struct {
	Base
	SessionID   uint        `json:"session_id" gorm:"not null"`
	Role        string      `json:"role" gorm:"size:50;not null"` // user, assistant
	Content     string      `json:"content" gorm:"type:text;not null"`
	TokenCount  int         `json:"token_count" gorm:"default:0"`
	ChatSession ChatSession `json:"chat_session,omitempty" gorm:"foreignKey:SessionID"`
}
