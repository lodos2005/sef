package summary

import (
	"context"
	"fmt"
	"sef/app/entities"
	"sef/pkg/providers"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3/log"
	"gorm.io/gorm"
)

type SummaryService struct {
	DB *gorm.DB
}

type SummaryServiceInterface interface {
	GenerateSessionSummary(sessionID uint, userID uint) (string, error)
	UpdateSessionSummary(sessionID uint, userID uint, summary string) error
	ShouldGenerateSummary(session *entities.Session) bool
	AutoGenerateSummaryIfNeeded(sessionID uint, userID uint) error
}

// NewSummaryService creates a new instance of SummaryService
func NewSummaryService(db *gorm.DB) SummaryServiceInterface {
	return &SummaryService{
		DB: db,
	}
}

// GenerateSessionSummary generates a summary for a chat session using AI
func (s *SummaryService) GenerateSessionSummary(sessionID uint, userID uint) (string, error) {
	// Load session with messages and chatbot
	var session entities.Session
	if err := s.DB.
		Where("id = ? AND user_id = ?", sessionID, userID).
		Preload("Chatbot").
		Preload("Chatbot.Provider").
		Preload("Messages").
		First(&session).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return "", fmt.Errorf("session not found")
		}
		return "", fmt.Errorf("failed to load session: %w", err)
	}

	// Check if there are enough messages to summarize
	if len(session.Messages) < 2 {
		return "", fmt.Errorf("not enough messages to generate summary")
	}

	// Create conversation text for summarization
	conversationText := s.formatConversationForSummary(session.Messages)

	// Generate summary using the session's chatbot provider
	summary, err := s.generateSummaryWithProvider(&session, conversationText)
	if err != nil {
		return "", fmt.Errorf("failed to generate summary: %w", err)
	}

	return summary, nil
}

// UpdateSessionSummary updates the summary for a session
func (s *SummaryService) UpdateSessionSummary(sessionID uint, userID uint, summary string) error {
	result := s.DB.Model(&entities.Session{}).
		Where("id = ? AND user_id = ?", sessionID, userID).
		Update("summary", summary)

	if result.Error != nil {
		return fmt.Errorf("failed to update session summary: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("session not found or not authorized")
	}

	return nil
}

// ShouldGenerateSummary determines if a session should have a summary generated
func (s *SummaryService) ShouldGenerateSummary(session *entities.Session) bool {
	// Generate summary if:
	// 1. No summary exists yet
	// 2. There are at least 2 messages (1 user + 1 assistant)
	// 3. The session has some substantial content

	hasNoSummary := session.Summary == ""
	hasEnoughMessages := len(session.Messages) >= 2
	hasSubstantialContent := s.hasSubstantialContent(session.Messages)

	log.Info("Summary generation check - hasNoSummary :", hasNoSummary, " hasEnoughMessages: ", hasEnoughMessages, "hasSubstantialContent:", hasSubstantialContent)

	return hasNoSummary && hasEnoughMessages && hasSubstantialContent
}

// AutoGenerateSummaryIfNeeded automatically generates a summary if conditions are met
func (s *SummaryService) AutoGenerateSummaryIfNeeded(sessionID uint, userID uint) error {
	log.Info("Checking if summary generation is needed for session", sessionID)

	// Load session to check if summary is needed
	var session entities.Session
	if err := s.DB.
		Where("id = ? AND user_id = ?", sessionID, userID).
		Preload("Messages").
		First(&session).Error; err != nil {
		log.Error("Failed to load session for summary generation:", err)
		return fmt.Errorf("failed to load session: %w", err)
	}

	log.Info("Session loaded with", len(session.Messages), "messages, current summary:", session.Summary)

	if !s.ShouldGenerateSummary(&session) {
		log.Info("Summary generation not needed for session", sessionID)
		return nil // No summary needed
	}

	log.Info("Generating summary for session", sessionID)

	// Generate summary asynchronously with timeout protection
	go func() {
		// Add a goroutine timeout as a safety net
		done := make(chan bool, 1)
		var summary string
		var err error

		go func() {
			summary, err = s.GenerateSessionSummary(sessionID, userID)
			done <- true
		}()

		// Wait for completion or timeout
		select {
		case <-done:
			if err != nil {
				log.Error("Failed to auto-generate summary for session", sessionID, ":", err)
				return
			}

			if err := s.UpdateSessionSummary(sessionID, userID, summary); err != nil {
				log.Error("Failed to save auto-generated summary for session", sessionID, ":", err)
			} else {
				log.Info("Auto-generated summary for session", sessionID, ":", summary)
			}
		case <-time.After(90 * time.Second):
			log.Error("Summary generation timed out for session", sessionID, "- abandoning attempt")
		}
	}()

	return nil
}

// formatConversationForSummary formats the conversation for summary generation
func (s *SummaryService) formatConversationForSummary(messages []entities.Message) string {
	var builder strings.Builder
	messageCount := 0
	maxMessages := 10 // Limit to last 10 messages to avoid very long prompts

	// Get the most recent messages (up to maxMessages)
	startIndex := 0
	if len(messages) > maxMessages {
		startIndex = len(messages) - maxMessages
	}

	for i := startIndex; i < len(messages); i++ {
		message := messages[i]
		if message.Role == "tool" {
			continue // Skip tool messages
		}

		role := "User"
		if message.Role == "assistant" {
			role = "Assistant"
		}

		// Remove <think></think> tagged content
		content := s.removeThinkTags(message.Content)

		// Truncate very long messages to avoid prompt bloat
		if len(content) > 500 {
			content = content[:500] + "..."
		}

		builder.WriteString(fmt.Sprintf("%s: %s\n\n", role, content))
		messageCount++
	}

	log.Info(fmt.Sprintf("Formatted %d messages for summary generation (from %d total messages)", messageCount, len(messages)))
	return builder.String()
}

// generateSummaryWithProvider generates a summary using the AI provider
func (s *SummaryService) generateSummaryWithProvider(session *entities.Session, conversationText string) (string, error) {
	// Create provider factory and get provider instance
	factory := &providers.ProviderFactory{}
	providerConfig := map[string]interface{}{
		"base_url": session.Chatbot.Provider.BaseURL,
		"api_key":  session.Chatbot.Provider.ApiKey,
	}

	provider, err := factory.NewProvider(session.Chatbot.Provider.Type, providerConfig)
	if err != nil {
		return "", fmt.Errorf("failed to create provider: %w", err)
	}

	// Prepare the prompt for summarization
	prompt := s.buildSummaryPrompt(conversationText)

	// Set options
	options := map[string]interface{}{}
	if session.Chatbot.ModelName != "" {
		options["model"] = session.Chatbot.ModelName
	}

	// Retry logic for summary generation
	maxRetries := 2
	for attempt := 1; attempt <= maxRetries; attempt++ {
		// Create context with longer timeout for summary generation
		ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)

		log.Info(fmt.Sprintf("Summary generation attempt %d/%d for session %d", attempt, maxRetries, session.ID))

		// Generate summary
		stream, err := provider.Generate(ctx, prompt, options)
		if err != nil {
			cancel()
			log.Error(fmt.Sprintf("Attempt %d failed for session %d: %v", attempt, session.ID, err))

			if attempt == maxRetries {
				return "", fmt.Errorf("failed to generate summary after %d attempts: %w", maxRetries, err)
			}

			// Wait before retry (2 seconds)
			time.Sleep(2 * time.Second)
			continue
		}

		// Collect the response
		var summary strings.Builder
		streamErr := func() error {
			defer cancel()
			for chunk := range stream {
				select {
				case <-ctx.Done():
					return ctx.Err()
				default:
					summary.WriteString(chunk)
				}
			}
			return nil
		}()

		if streamErr != nil {
			log.Error(fmt.Sprintf("Stream error on attempt %d for session %d: %v", attempt, session.ID, streamErr))

			if attempt == maxRetries {
				return "", fmt.Errorf("failed to complete summary stream after %d attempts: %w", maxRetries, streamErr)
			}

			// Wait before retry
			time.Sleep(2 * time.Second)
			continue
		}

		summaryText := strings.TrimSpace(summary.String())
		if summaryText == "" {
			log.Error(fmt.Sprintf("Empty summary generated on attempt %d for session %d", attempt, session.ID))

			if attempt == maxRetries {
				return "", fmt.Errorf("empty summary generated after %d attempts", maxRetries)
			}

			// Wait before retry
			time.Sleep(2 * time.Second)
			continue
		}

		// Limit summary length to maximum 6 words
		words := strings.Fields(summaryText)
		if len(words) > 6 {
			summaryText = strings.Join(words[:6], " ")
		}

		log.Info(fmt.Sprintf("Successfully generated summary for session %d on attempt %d: %s", session.ID, attempt, summaryText))
		return summaryText, nil
	}

	return "", fmt.Errorf("failed to generate summary after %d attempts", maxRetries)
}

// buildSummaryPrompt creates the prompt for summary generation
func (s *SummaryService) buildSummaryPrompt(conversationText string) string {
	return fmt.Sprintf(`Create a 2-6 word title for this conversation. Use the conversation's language. No quotes, just the title.

%s

Title:`, conversationText)
}

// removeThinkTags removes content within <think></think> tags from the message
func (s *SummaryService) removeThinkTags(content string) string {
	// Use regex to remove all <think>...</think> blocks (case-insensitive, multiline)
	for {
		start := strings.Index(strings.ToLower(content), "<think>")
		if start == -1 {
			break
		}

		end := strings.Index(strings.ToLower(content[start:]), "</think>")
		if end == -1 {
			// If we find opening tag but no closing tag, remove from opening tag to end
			content = content[:start]
			break
		}

		// Remove the entire <think>...</think> block
		end = start + end + len("</think>")
		content = content[:start] + content[end:]
	}

	// Clean up any extra whitespace that might be left
	content = strings.TrimSpace(content)

	return content
}

// hasSubstantialContent checks if the messages contain substantial content
func (s *SummaryService) hasSubstantialContent(messages []entities.Message) bool {
	totalLength := 0
	for _, message := range messages {
		if message.Role != "tool" {
			totalLength += len(message.Content)
		}
	}
	// Require at least 50 characters of total content for quicker summary generation
	return totalLength >= 50
}
