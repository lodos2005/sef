package entities

type Session struct {
	Base
	UserID    uint      `json:"user_id" gorm:"not null"`
	ChatbotID uint      `json:"chatbot_id" gorm:"not null"`
	User      User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Chatbot   Chatbot   `json:"chatbot,omitempty" gorm:"foreignKey:ChatbotID"`
	Messages  []Message `json:"messages,omitempty" gorm:"foreignKey:SessionID"`
}
