package entities

type Settings struct {
	Base
	Key   string `json:"key" gorm:"unique;not null"`
	Value string `json:"value" gorm:"type:text"`
}

func (Settings) TableName() string {
	return "settings"
}
