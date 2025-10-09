package documents

import (
	"context"
	"fmt"
	"io"
	"path/filepath"
	"sef/app/entities"
	"sef/internal/paginator"
	"sef/pkg/documentservice"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

type Controller struct {
	DB              *gorm.DB
	DocumentService *documentservice.DocumentService
}

// Index returns paginated list of all documents (global)
func (h *Controller) Index(c fiber.Ctx) error {
	var items []*entities.Document
	db := h.DB.Model(&entities.Document{})

	// Filter by status
	if status := c.Query("status"); status != "" {
		db = db.Where("status = ?", status)
	}

	// Order by created date
	db = db.Order("created_at DESC")

	page, err := paginator.New(db, c).Paginate(&items)
	if err != nil {
		return err
	}

	return c.JSON(page)
}

// Show returns a single document
func (h *Controller) Show(c fiber.Ctx) error {
	var item *entities.Document
	if err := h.DB.Preload("Chatbots").First(&item, c.Params("id")).Error; err != nil {
		return err
	}

	return c.JSON(item)
}

// Upload handles document upload and processing (admin only)
func (h *Controller) Upload(c fiber.Ctx) error {
	// Get file from form
	file, err := c.FormFile("file")
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "No file uploaded")
	}

	// Validate file size (max 10MB)
	if file.Size > 10*1024*1024 {
		return fiber.NewError(fiber.StatusBadRequest, "File too large (max 10MB)")
	}

	// Get optional parameters
	title := c.FormValue("title")
	if title == "" {
		title = strings.TrimSuffix(file.Filename, filepath.Ext(file.Filename))
	}

	description := c.FormValue("description")

	// Open and read file
	fileHandle, err := file.Open()
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Failed to open file")
	}
	defer fileHandle.Close()

	content, err := io.ReadAll(fileHandle)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Failed to read file")
	}

	// Determine file type and validate
	fileType := filepath.Ext(file.Filename)
	allowedTypes := []string{".txt", ".md", ".markdown", ".text"}
	isAllowed := false
	for _, allowed := range allowedTypes {
		if strings.EqualFold(fileType, allowed) {
			isAllowed = true
			break
		}
	}

	if !isAllowed {
		return fiber.NewError(fiber.StatusBadRequest, "File type not supported. Allowed: .txt, .md, .markdown")
	}

	// Create document entity
	document := &entities.Document{
		Title:       title,
		Description: description,
		Content:     string(content),
		FileName:    file.Filename,
		FileType:    fileType,
		FileSize:    file.Size,
		Status:      "pending",
	}

	if err := h.DB.Create(document).Error; err != nil {
		return err
	}

	// Process document asynchronously
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
		defer cancel()

		if err := h.DocumentService.ProcessDocument(ctx, document); err != nil {
			// Log error (in production, use proper logging)
			fmt.Printf("Error processing document %d: %v\n", document.ID, err)
		}
	}()

	return c.JSON(document)
}

func (h *Controller) ProcessManually(c fiber.Ctx) error {
	var document *entities.Document
	if err := h.DB.First(&document, c.Params("id")).Error; err != nil {
		return err
	}

	// Process document asynchronously
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
		defer cancel()

		if err := h.DocumentService.ProcessDocument(ctx, document); err != nil {
			// Log error (in production, use proper logging)
			fmt.Printf("Error processing document %d: %v\n", document.ID, err)
		}
	}()

	return c.JSON(fiber.Map{"message": "Document processing started"})
}

// Delete removes a document and its embeddings (admin only)
func (h *Controller) Delete(c fiber.Ctx) error {
	var document *entities.Document
	if err := h.DB.First(&document, c.Params("id")).Error; err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := h.DocumentService.DeleteDocument(ctx, document); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, fmt.Sprintf("Failed to delete document: %v", err))
	}

	return c.JSON(fiber.Map{"message": "Document deleted successfully"})
}

// Search performs semantic search across documents
func (h *Controller) Search(c fiber.Ctx) error {
	var payload struct {
		Query string `json:"query"`
		Limit int    `json:"limit"`
	}

	if err := c.Bind().JSON(&payload); err != nil {
		return err
	}

	if payload.Query == "" {
		return fiber.NewError(fiber.StatusBadRequest, "Query is required")
	}

	if payload.Limit == 0 {
		payload.Limit = 5
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Search without filter (global search)
	results, err := h.DocumentService.SearchDocuments(ctx, payload.Query, payload.Limit, nil)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, fmt.Sprintf("Search failed: %v", err))
	}

	return c.JSON(fiber.Map{
		"query":   payload.Query,
		"results": results,
	})
}
