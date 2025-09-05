package sessions

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"sef/app/entities"
	"sef/internal/paginator"
	"sef/internal/search"
	"sef/internal/validation"
	"sef/pkg/providers"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/log"
	"github.com/valyala/fasthttp"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type SendMessageRequest struct {
	Content string `json:"content" validate:"required,min=1"`
}

type Controller struct {
	DB *gorm.DB
}

func (h *Controller) Index(c fiber.Ctx) error {
	var items []*entities.Session
	currentUser := c.Locals("user").(*entities.User)

	db := h.DB.Model(&entities.Session{}).
		Where("user_id = ?", currentUser.ID)

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
	sessionID, err := h.validateAndParseSessionID(c)
	if err != nil {
		return err
	}

	user := c.Locals("user").(*entities.User)
	session, err := h.getSessionByIDAndUser(sessionID, user.ID)
	if err != nil {
		return err
	}

	// Parse and validate request
	req, err := h.parseSendMessageRequest(c)
	if err != nil {
		return err
	}

	// Load session with full data
	if err := h.loadSessionWithChatbotAndMessages(session, sessionID, user.ID); err != nil {
		return err
	}

	// Save user message
	if err := h.saveUserMessage(sessionID, req.Content); err != nil {
		return err
	}

	// Prepare chat messages
	messages := h.prepareChatMessages(session, req.Content)

	// Create provider and generate response
	return h.streamChatResponse(c, session, messages)
}

// Helper functions

// validateAndParseSessionID validates and parses session ID from URL params
func (h *Controller) validateAndParseSessionID(c fiber.Ctx) (uint, error) {
	sessionID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return 0, c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid session ID",
		})
	}
	return uint(sessionID), nil
}

// getSessionByIDAndUser retrieves a session by ID and user ID
func (h *Controller) getSessionByIDAndUser(sessionID, userID uint) (*entities.Session, error) {
	var session entities.Session
	if err := h.DB.
		Where("id = ? AND user_id = ?", sessionID, userID).
		First(&session).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fiber.NewError(fiber.StatusNotFound, "Chat session not found")
		}
		log.Error("Failed to fetch chat session:", err)
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Failed to fetch chat session")
	}
	return &session, nil
}

// parseSendMessageRequest parses and validates the send message request
func (h *Controller) parseSendMessageRequest(c fiber.Ctx) (*SendMessageRequest, error) {
	var req SendMessageRequest
	if err := c.Bind().Body(&req); err != nil {
		return nil, c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if err := validation.Validate(req); err != nil {
		return nil, c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"errors": err,
		})
	}

	return &req, nil
}

// loadSessionWithChatbotAndMessages loads session with chatbot and messages
func (h *Controller) loadSessionWithChatbotAndMessages(session *entities.Session, sessionID, userID uint) error {
	if err := h.DB.
		Where("id = ? AND user_id = ?", sessionID, userID).
		Preload("Chatbot").
		Preload("Chatbot.Provider").
		Preload("Messages").
		First(&session).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fiber.NewError(fiber.StatusNotFound, "Chat session not found")
		}
		log.Error("Failed to fetch chat session:", err)
		return fiber.NewError(fiber.StatusInternalServerError, "Failed to fetch chat session")
	}
	return nil
}

// saveUserMessage saves the user message to database
func (h *Controller) saveUserMessage(sessionID uint, content string) error {
	userMessage := entities.Message{
		SessionID: sessionID,
		Role:      "user",
		Content:   content,
	}

	if err := h.DB.Create(&userMessage).Error; err != nil {
		log.Error("Failed to save user message:", err)
		return fiber.NewError(fiber.StatusInternalServerError, "Failed to save message")
	}

	return nil
}

// prepareChatMessages prepares the messages array for the chat API
func (h *Controller) prepareChatMessages(session *entities.Session, userContent string) []providers.ChatMessage {
	var messages []providers.ChatMessage

	// Add system message if system prompt exists
	if session.Chatbot.SystemPrompt != "" {
		messages = append(messages, providers.ChatMessage{
			Role:    "system",
			Content: session.Chatbot.SystemPrompt,
		})
	}

	// Add current chat session messages
	for _, msg := range session.Messages {
		messages = append(messages, providers.ChatMessage{
			Role:    msg.Role,
			Content: msg.Content,
		})
	}

	// Add current user message
	messages = append(messages, providers.ChatMessage{
		Role:    "user",
		Content: userContent,
	})

	return messages
}

// streamChatResponse handles the streaming chat response
func (h *Controller) streamChatResponse(c fiber.Ctx, session *entities.Session, messages []providers.ChatMessage) error {
	// Create provider instance
	factory := &providers.ProviderFactory{}
	providerConfig := map[string]interface{}{
		"base_url": session.Chatbot.Provider.BaseURL,
	}
	provider, err := factory.NewProvider(session.Chatbot.Provider.Type, providerConfig)
	if err != nil {
		log.Error("Failed to create provider:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialize provider",
		})
	}

	// Create assistant message record
	assistantMessage, err := h.createAssistantMessage(session.ID)
	if err != nil {
		return err
	}

	// Set streaming headers
	h.setStreamingHeaders(c)

	// Generate and stream response
	return h.generateAndStreamResponse(c, provider, messages, session.Chatbot.ModelName, assistantMessage)
}

// createAssistantMessage creates an empty assistant message record
func (h *Controller) createAssistantMessage(sessionID uint) (*entities.Message, error) {
	assistantMessage := entities.Message{
		SessionID: sessionID,
		Role:      "assistant",
		Content:   "",
	}

	if err := h.DB.Create(&assistantMessage).Error; err != nil {
		log.Error("Failed to create assistant message:", err)
		return nil, fiber.NewError(fiber.StatusInternalServerError, "Failed to create message record")
	}

	return &assistantMessage, nil
}

// setStreamingHeaders sets the necessary headers for SSE streaming
func (h *Controller) setStreamingHeaders(c fiber.Ctx) {
	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("Transfer-Encoding", "chunked")
}

// generateAndStreamResponse generates the chat response and streams it
func (h *Controller) generateAndStreamResponse(c fiber.Ctx, provider providers.LLMProvider, messages []providers.ChatMessage, modelName string, assistantMessage *entities.Message) error {
	// Prepare options
	options := make(map[string]interface{})
	if modelName != "" {
		options["model"] = modelName
		log.Info("Using model from chatbot:", modelName)
	} else {
		log.Info("Using default model")
	}

	// Generate streaming response
	stream, err := provider.GenerateChat(context.Background(), messages, options)
	if err != nil {
		log.Error("Failed to generate response:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate response",
		})
	}

	// Stream the response
	return h.streamResponse(c, stream, assistantMessage)
}

// streamResponse handles the actual streaming of the response
func (h *Controller) streamResponse(c fiber.Ctx, stream <-chan string, assistantMessage *entities.Message) error {
	var fullResponse strings.Builder

	c.Response().SetBodyStreamWriter(fasthttp.StreamWriter(func(w *bufio.Writer) {
		defer func() {
			// Update the assistant message with full content (async)
			go h.updateAssistantMessage(assistantMessage, fullResponse.String())
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

// updateAssistantMessage updates the assistant message with the full response
func (h *Controller) updateAssistantMessage(assistantMessage *entities.Message, content string) {
	assistantMessage.Content = content
	if err := h.DB.Save(&assistantMessage).Error; err != nil {
		log.Error("Failed to update assistant message:", err)
	}
}
