package entities

import "encoding/json"

type User struct {
	Base
	Name       string `json:"name" gorm:"not null;size:100"`
	Username   string `json:"username" gorm:"unique;not null;size:50"`
	Password   string `json:"password"`
	SuperAdmin *bool  `json:"super_admin" gorm:"default:false"`
}

func (u *User) IsSuperAdmin() bool {
	return u.SuperAdmin != nil && *u.SuperAdmin
}

func (u User) MarshalJSON() ([]byte, error) {
	type Alias User
	aux := struct {
		Alias
		Password *string `json:"password,omitempty"`
	}{
		Alias:    (Alias)(u),
		Password: nil,
	}
	return json.Marshal(aux)
}
