package tools

import (
	"fmt"
	"io"
	"sef/app/entities"
	"sef/internal/paginator"
	"sef/internal/search"
	"sef/pkg/importservice"
	"sef/pkg/toolrunners"
	"strings"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Controller struct {
	DB *gorm.DB
}

func (h *Controller) Index(c fiber.Ctx) error {
	var items []*entities.Tool
	db := h.DB.Model(&entities.Tool{}).Preload(clause.Associations)

	if c.Query("search") != "" {
		search.Search(c.Query("search"), db)
	}

	page, err := paginator.New(db, c).Paginate(&items)
	if err != nil {
		return err
	}

	return c.JSON(page)
}

func (h *Controller) Show(c fiber.Ctx) error {
	var item *entities.Tool
	if err := h.DB.Preload(clause.Associations).First(&item, c.Params("id")).Error; err != nil {
		return err
	}

	return c.JSON(item)
}

func (h *Controller) Create(c fiber.Ctx) error {
	var payload *entities.Tool
	if err := c.Bind().JSON(&payload); err != nil {
		return err
	}

	// Validate tool type
	if payload.Type == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "tool type is required"})
	}

	// Validate tool runner exists
	factory := &toolrunners.ToolRunnerFactory{}
	if _, err := factory.NewToolRunner(payload.Type, payload.Config, payload.Parameters); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if err := h.DB.
		Clauses(clause.Returning{}).
		Create(&payload).Error; err != nil {
		return err
	}

	return c.JSON(payload)
}

func (h *Controller) Update(c fiber.Ctx) error {
	var payload *entities.Tool
	if err := c.Bind().JSON(&payload); err != nil {
		return err
	}

	var tool *entities.Tool
	if err := h.DB.First(&tool, c.Params("id")).Error; err != nil {
		return err
	}

	// Validate tool type if it's being updated
	if payload.Type != "" {
		factory := &toolrunners.ToolRunnerFactory{}
		if _, err := factory.NewToolRunner(payload.Type, payload.Config, payload.Parameters); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
	}

	if err := h.DB.
		Clauses(clause.Returning{}).
		Model(&entities.Tool{}).
		Where("id = ?", c.Params("id")).
		Updates(&payload).Error; err != nil {
		return err
	}

	return c.JSON(payload)
}

func (h *Controller) Delete(c fiber.Ctx) error {
	if err := h.DB.Delete(&entities.Tool{}, c.Params("id")).Error; err != nil {
		return err
	}

	return c.JSON(fiber.Map{"message": "Tool deleted successfully"})
}

func (h *Controller) Types(c fiber.Ctx) error {
	// For now, hardcoded list of supported tool types
	// In the future, this could be dynamic based on available tool runners
	factory := &toolrunners.ToolRunnerFactory{}
	return c.JSON(fiber.Map{"types": factory.SupportedTypes()})
}

func (h *Controller) Schema(c fiber.Ctx) error {
	toolType := c.Query("type")
	if toolType == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "type query parameter is required"})
	}

	// Create tool runner to get schema
	factory := &toolrunners.ToolRunnerFactory{}
	runner, err := factory.NewToolRunner(toolType, map[string]interface{}{}, map[string]interface{}{})
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	schema := runner.GetConfigSchema()
	return c.JSON(fiber.Map{"schema": schema})
}

func (h *Controller) Import(c fiber.Ctx) error {
	// Get the uploaded file
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "no file uploaded"})
	}

	// Check file extension
	filename := strings.ToLower(file.Filename)
	if !strings.HasSuffix(filename, ".json") && !strings.HasSuffix(filename, ".yaml") && !strings.HasSuffix(filename, ".yml") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "only JSON, YAML, and YML files are supported"})
	}

	// Open and read the file
	fileReader, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to open file"})
	}
	defer fileReader.Close()

	fileData, err := io.ReadAll(fileReader)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to read file"})
	}

	// Create import service and process the file
	importService := importservice.NewImportService()
	var result *importservice.ImportResult

	// Determine file format and call appropriate import method
	if strings.HasSuffix(filename, ".yaml") || strings.HasSuffix(filename, ".yml") {
		result, err = importService.ImportFromYAML(fileData)
	} else {
		result, err = importService.ImportFromJSON(fileData)
	}

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// If import failed, return the errors
	if !result.Success {
		return c.Status(fiber.StatusBadRequest).JSON(result)
	}

	// Save the imported tools to database
	var savedTools []entities.Tool
	var saveErrors []string

	for _, tool := range result.Tools {
		// Validate tool type
		factory := &toolrunners.ToolRunnerFactory{}
		if _, err := factory.NewToolRunner(tool.Type, map[string]interface{}(tool.Config), tool.Parameters); err != nil {
			saveErrors = append(saveErrors, fmt.Sprintf("failed to validate tool '%s': %v", tool.Name, err))
			continue
		}

		// Check if tool with same name already exists
		var existingTool entities.Tool
		if err := h.DB.Where("name = ?", tool.Name).First(&existingTool).Error; err == nil {
			// Tool exists, skip or update based on query parameter
			if c.Query("update_existing") == "true" {
				// Update existing tool
				if err := h.DB.Model(&existingTool).Updates(&tool).Error; err != nil {
					saveErrors = append(saveErrors, fmt.Sprintf("failed to update tool '%s': %v", tool.Name, err))
					continue
				}
				savedTools = append(savedTools, existingTool)
			} else {
				saveErrors = append(saveErrors, fmt.Sprintf("tool '%s' already exists (use update_existing=true to overwrite)", tool.Name))
				continue
			}
		} else {
			// Create new tool
			if err := h.DB.Create(&tool).Error; err != nil {
				saveErrors = append(saveErrors, fmt.Sprintf("failed to save tool '%s': %v", tool.Name, err))
				continue
			}
			savedTools = append(savedTools, tool)
		}
	}

	// Return the result
	return c.JSON(fiber.Map{
		"success":        len(saveErrors) == 0,
		"imported_count": len(savedTools),
		"total_count":    len(result.Tools),
		"tools":          savedTools,
		"errors":         append(result.Errors, saveErrors...),
	})
}
