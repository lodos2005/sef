package entities

type Locale string

const (
	LocaleEN Locale = "en"
	LocaleTR Locale = "tr"
)

type User struct {
	Base
	KeycloakID string `json:"keycloak_id" gorm:"unique;default:''"`
	Name       string `json:"name" gorm:"not null;size:100"`
	Username   string `json:"username" gorm:"unique;not null;size:50"`
	Email      string `json:"email" gorm:"size:255"`
	Locale     Locale `json:"locale" gorm:"type:VARCHAR(5);default:'tr'"`
	IsAdmin    bool   `json:"super_admin" gorm:"default:false"`
}
