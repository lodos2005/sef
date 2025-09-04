package entities

type Message struct {
	Base
	SessionID uint    `json:"session_id" gorm:"not null"`
	Role      string  `json:"role" gorm:"size:50;not null"` // user, assistant
	Content   string  `json:"content" gorm:"type:text;not null"`
	Session   Session `json:"session,omitempty" gorm:"foreignKey:SessionID"`
}
