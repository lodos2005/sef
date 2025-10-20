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
	"sef/pkg/rag"
	"sef/pkg/summary"
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
	SummaryService   summary.SummaryServiceInterface
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
	if item.UserID != currentUser.ID && !currentUser.IsAdmin {
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
	if item.UserID != currentUser.ID && !currentUser.IsAdmin {
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
	if session.UserID != currentUser.ID && !currentUser.IsAdmin {
		return fiber.ErrForbidden
	}

	var messages []*entities.Message
	if err := h.DB.Where("session_id = ?", session.ID).
		Where("role != ?", "tool").
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
	messages, ragResult := h.MessagingService.PrepareChatMessages(session, req.Content)

	// Generate and stream response
	return h.streamChatResponse(c, session, messages, ragResult, req.WebSearchEnabled, sessionID, user.ID)
}

// streamChatResponse handles the streaming chat response
func (h *Controller) streamChatResponse(c fiber.Ctx, session *entities.Session, messages []providers.ChatMessage, ragResult *rag.AugmentPromptResult, webSearchEnabled bool, sessionID uint, userID uint) error {
	// Generate response stream
	stream, finalMessage, err := h.MessagingService.GenerateChatResponse(session, messages, ragResult, webSearchEnabled)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Set streaming headers
	h.setStreamingHeaders(c)

	// Stream the response with summary generation callback
	return h.streamResponseWithCallback(c, stream, finalMessage, sessionID, userID)
}

// streamResponseWithCallback handles the actual streaming of the response with callback
func (h *Controller) streamResponseWithCallback(c fiber.Ctx, stream <-chan string, assistantMessage *entities.Message, sessionID uint, userID uint) error {
	var fullResponse strings.Builder

	log.Info("Starting stream response callback for session:", sessionID)

	c.Response().SetBodyStreamWriter(fasthttp.StreamWriter(func(w *bufio.Writer) {
		defer func() {
			log.Info("Stream ended for session:", sessionID, "Full response length:", fullResponse.Len())
			// Update the assistant message with full content and trigger summary generation (async)
			go h.MessagingService.UpdateAssistantMessageWithCallback(assistantMessage, fullResponse.String(), func() {
				// Trigger automatic summary generation after assistant message is saved
				go h.SummaryService.AutoGenerateSummaryIfNeeded(sessionID, userID)
			})
		}()

		chunkCount := 0
		for chunk := range stream {
			chunkCount++

			if chunk == "" {
				continue
			}

			fullResponse.WriteString(chunk)

			// Send JSON formatted chunk
			if err := h.sendChunk(w, chunk); err != nil {
				log.Error("Error sending chunk:", err)
				return // Exit gracefully on connection error
			}
		}

		log.Info("Stream processing complete for session:", sessionID, "Total chunks:", chunkCount)
		// Send end event
		h.sendEndEvent(w)
	}))

	return nil
}

// setStreamingHeaders sets the necessary headers for SSE streaming
func (h *Controller) setStreamingHeaders(c fiber.Ctx) {
	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("Transfer-Encoding", "chunked")
	c.Set("X-Accel-Buffering", "no") // Disable proxy buffering
	c.Set("Access-Control-Allow-Origin", "*")
	c.Set("Access-Control-Allow-Headers", "Cache-Control")
}

// sendChunk sends a single chunk of the response
func (h *Controller) sendChunk(w *bufio.Writer, chunk string) error {
	var msgType string
	var content string

	// Detect if this is an error message
	if strings.HasPrefix(chunk, "I apologize, but I'm having trouble") ||
		strings.Contains(chunk, "Error details:") ||
		strings.Contains(chunk, "Tool") && strings.Contains(chunk, "encountered an error") ||
		strings.Contains(chunk, "not available or has been removed") ||
		strings.Contains(chunk, "took too long to respond") {
		msgType = "error"
		content = chunk
		log.Info("Sending error message:", chunk)
	} else {
		msgType = "chunk"
		content = chunk
	}

	data := map[string]interface{}{
		"type": msgType,
		"data": content,
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
	fmt.Fprint(w, endJson)
	w.Flush()
}

// sendKeepAlive sends a keep-alive ping to maintain connection
func (h *Controller) sendKeepAlive(w *bufio.Writer) error {
	keepAliveData := map[string]interface{}{
		"type": "ping",
	}
	jsonBytes, err := json.Marshal(keepAliveData)
	if err != nil {
		return err
	}

	jsonData := string(jsonBytes) + "\n"
	fmt.Fprint(w, jsonData)
	return w.Flush()
}
