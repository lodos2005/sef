package entities

type Document struct {
	Base
	Title       string      `json:"title" gorm:"not null"`
	Description string      `json:"description" gorm:"type:text"`
	Content     string      `json:"content" gorm:"type:text"`
	FileName    string      `json:"file_name"`
	FileType    string      `json:"file_type"`
	FileSize    int64       `json:"file_size"`
	ChunkCount  int         `json:"chunk_count" gorm:"default:0"`
	Status      string      `json:"status" gorm:"default:'pending'"` // pending, processing, ready, failed
	Metadata    SingleJSONB `json:"metadata" gorm:"type:jsonb"`
	Chatbots    []Chatbot   `json:"chatbots,omitempty" gorm:"many2many:chatbot_documents;"`
}

func (Document) TableName() string {
	return "documents"
}
