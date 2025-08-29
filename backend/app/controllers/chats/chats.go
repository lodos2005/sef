package chats

import (
	"sef/app/entities"
	"sef/internal/database"
	"sef/internal/paginator"
	"sef/internal/search"

	"github.com/gofiber/fiber/v3"
)

func Index(c fiber.Ctx) error {
	var items []*entities.ChatSession
	db := database.Connection().Model(&entities.ChatSession{}).Preload("User").Preload("Chatbot")

	if c.Query("search") != "" {
		search.Search(c.Query("search"), db)
	}

	page, err := paginator.New(db, c).Paginate(&items)
	if err != nil {
		return err
	}

	return c.JSON(page)
}

func Show(c fiber.Ctx) error {
	var item *entities.ChatSession
	if err := database.Connection().Preload("User").Preload("Chatbot").Preload("Messages").First(&item, c.Params("id")).Error; err != nil {
		return err
	}

	return c.JSON(item)
}

func Create(c fiber.Ctx) error {
	var payload *entities.ChatSession
	if err := c.Bind().JSON(&payload); err != nil {
		return err
	}

	if err := database.Connection().Create(&payload).Error; err != nil {
		return err
	}

	return c.JSON(payload)
}

func Update(c fiber.Ctx) error {
	var item *entities.ChatSession
	if err := database.Connection().First(&item, c.Params("id")).Error; err != nil {
		return err
	}

	if err := c.Bind().JSON(&item); err != nil {
		return err
	}

	if err := database.Connection().Save(&item).Error; err != nil {
		return err
	}

	return c.JSON(item)
}

func Delete(c fiber.Ctx) error {
	if err := database.Connection().Delete(&entities.ChatSession{}, c.Params("id")).Error; err != nil {
		return err
	}

	return c.JSON(fiber.Map{"message": "Chat deleted successfully"})
}

func GetMessages(c fiber.Ctx) error {
	var items []*entities.Message
	db := database.Connection().Model(&entities.Message{}).Where("session_id = ?", c.Params("id")).Order("created_at ASC")

	page, err := paginator.New(db, c).Paginate(&items)
	if err != nil {
		return err
	}

	return c.JSON(page)
}
