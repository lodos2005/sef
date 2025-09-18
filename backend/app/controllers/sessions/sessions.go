package sessions

import (
	"bufio"
	"encoding/json"
	"fmt"
	"sef/app/entities"
	"sef/internal/paginator"
	"sef/internal/search"
	"sef/pkg/messaging"
	"sef/pkg/providers"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"github.com/valyala/fasthttp"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Controller struct {
	DB               *gorm.DB
	MessagingService messaging.MessagingServiceInterface
}

func (h *Controller) Index(c fiber.Ctx) error {
	var items []*entities.Session
	currentUser := c.Locals("user").(*entities.User)

	db := h.DB.Model(&entities.Session{}).
		Where("user_id = ?", currentUser.ID).
		Preload(clause.Associations)

	if c.Query("search") != "" {
		search.Search(c.Query("search"), db)
	}

	page, err := paginator.New(db, c).Paginate(&items)
	if err != nil {
		return err
	}

	return c.JSON(page)
}

func (h *Controller) IndexAdmin(c fiber.Ctx) error {
	var items []*entities.Session
	db := h.DB.Model(&entities.Session{}).Preload(clause.Associations)

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
	var item *entities.Session
	if err := h.DB.Preload(clause.Associations).First(&item, c.Params("id")).Error; err != nil {
		return err
	}

	currentUser := c.Locals("user").(*entities.User)
	if item.UserID != currentUser.ID && *currentUser.SuperAdmin == false {
		return fiber.ErrForbidden
	}

	return c.JSON(item)
}

func (h *Controller) Create(c fiber.Ctx) error {
	var payload *entities.Session
	if err := c.Bind().JSON(&payload); err != nil {
		return err
	}

	payload.UserID = c.Locals("user").(*entities.User).ID

	if err := h.DB.
		Clauses(clause.Returning{}).
		Create(&payload).Error; err != nil {
		return err
	}

	return c.JSON(payload)
}

func (h *Controller) Delete(c fiber.Ctx) error {
	var item *entities.Session
	if err := h.DB.First(&item, c.Params("id")).Error; err != nil {
		return err
	}

	currentUser := c.Locals("user").(*entities.User)
	if item.UserID != currentUser.ID && *currentUser.SuperAdmin == false {
		return fiber.ErrForbidden
	}

	if err := h.DB.Delete(&entities.Session{}, c.Params("id")).Error; err != nil {
		return err
	}

	return c.JSON(fiber.Map{"message": "Session deleted successfully"})
}

func (h *Controller) Messages(c fiber.Ctx) error {
	var session *entities.Session
	if err := h.DB.First(&session, c.Params("id")).Error; err != nil {
		return err
	}

	currentUser := c.Locals("user").(*entities.User)
	if session.UserID != currentUser.ID && *currentUser.SuperAdmin == false {
		return fiber.ErrForbidden
	}

	var messages []*entities.Message
	if err := h.DB.Where("session_id = ?", session.ID).
		Order("created_at ASC").Find(&messages).Error; err != nil {
		return err
	}

	return c.JSON(messages)
}

func (h *Controller) SendMessage(c fiber.Ctx) error {
	sessionID, err := h.MessagingService.ValidateAndParseSessionID(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	user := c.Locals("user").(*entities.User)
	session, err := h.MessagingService.GetSessionByIDAndUser(sessionID, user.ID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return fiber.NewError(fiber.StatusNotFound, err.Error())
		}
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}

	// Parse and validate request
	req, err := h.MessagingService.ParseSendMessageRequest(c.Body())
	if err != nil {
		if strings.Contains(err.Error(), "validation failed") {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"errors": strings.TrimPrefix(err.Error(), "validation failed: "),
			})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Load session with full data including tools
	session, err = h.MessagingService.LoadSessionWithChatbotToolsAndMessages(sessionID, user.ID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return fiber.NewError(fiber.StatusNotFound, err.Error())
		}
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}

	// Save user message
	if err := h.MessagingService.SaveUserMessage(sessionID, req.Content); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}

	// Prepare chat messages
	messages := h.MessagingService.PrepareChatMessages(session, req.Content)

	// Generate and stream response
	return h.streamChatResponse(c, session, messages)
}

// streamChatResponse handles the streaming chat response
func (h *Controller) streamChatResponse(c fiber.Ctx, session *entities.Session, messages []providers.ChatMessage) error {
	// Generate response stream
	stream, finalMessage, err := h.MessagingService.GenerateChatResponse(session, messages)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Set streaming headers
	h.setStreamingHeaders(c)

	// Stream the response
	return h.streamResponse(c, stream, finalMessage)
}

// setStreamingHeaders sets the necessary headers for SSE streaming
func (h *Controller) setStreamingHeaders(c fiber.Ctx) {
	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("Transfer-Encoding", "chunked")
}

// streamResponse handles the actual streaming of the response
func (h *Controller) streamResponse(c fiber.Ctx, stream <-chan string, assistantMessage *entities.Message) error {
	var fullResponse strings.Builder

	c.Response().SetBodyStreamWriter(fasthttp.StreamWriter(func(w *bufio.Writer) {
		defer func() {
			// Update the assistant message with full content (async)
			go h.MessagingService.UpdateAssistantMessage(assistantMessage, fullResponse.String())
		}()

		for chunk := range stream {
			if chunk == "" {
				continue
			}

			fullResponse.WriteString(chunk)

			// Send JSON formatted chunk
			if err := h.sendChunk(w, chunk); err != nil {
				log.Error("Error sending chunk:", err)
				break
			}
		}

		// Send end event
		h.sendEndEvent(w)
	}))

	return nil
}

// sendChunk sends a single chunk of the response
func (h *Controller) sendChunk(w *bufio.Writer, chunk string) error {
	data := map[string]interface{}{
		"type": "chunk",
		"data": chunk,
	}
	jsonBytes, err := json.Marshal(data)
	if err != nil {
		log.Error("Failed to marshal chunk to JSON:", err)
		return err
	}

	jsonData := string(jsonBytes) + "\n"
	fmt.Fprint(w, jsonData)

	return w.Flush()
}

// sendEndEvent sends the end event to signal completion
func (h *Controller) sendEndEvent(w *bufio.Writer) {
	endData := map[string]interface{}{
		"type": "done",
	}
	endBytes, err := json.Marshal(endData)
	if err != nil {
		log.Error("Failed to marshal end event to JSON:", err)
		return
	}

	endJson := string(endBytes) + "\n"
	log.Info("Sending end event:", endJson)
	fmt.Fprint(w, endJson)
	w.Flush()
}
