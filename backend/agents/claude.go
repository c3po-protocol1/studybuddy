package agents

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

const anthropicBaseURL = "https://api.anthropic.com/v1/messages"
const anthropicVersion = "2023-06-01"

// apiKey and model are set once at startup via Configure().
var (
	apiKey string
	model  string
)

// Configure sets the API key and model for all Claude calls.
// Must be called before any agent functions are used.
func Configure(anthropicAPIKey, claudeModel string) {
	apiKey = anthropicAPIKey
	model = claudeModel
}

type claudeMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type claudeRequest struct {
	Model     string          `json:"model"`
	MaxTokens int             `json:"max_tokens"`
	Messages  []claudeMessage `json:"messages"`
}

type claudeContentBlock struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type claudeResponse struct {
	Content []claudeContentBlock `json:"content"`
	Error   *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// CallClaude sends a prompt to the Anthropic Claude API and returns the response text.
func CallClaude(prompt string, maxTokens int) (string, error) {
	if apiKey == "" {
		return "", fmt.Errorf("ANTHROPIC_API_KEY not configured")
	}
	if model == "" {
		return "", fmt.Errorf("CLAUDE_MODEL not configured")
	}

	reqBody := claudeRequest{
		Model:     model,
		MaxTokens: maxTokens,
		Messages: []claudeMessage{
			{Role: "user", Content: prompt},
		},
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, anthropicBaseURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", anthropicVersion)
	req.Header.Set("content-type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to call Claude API: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("Claude API error (status %d): %s", resp.StatusCode, string(respBytes))
	}

	var claudeResp claudeResponse
	if err := json.Unmarshal(respBytes, &claudeResp); err != nil {
		return "", fmt.Errorf("failed to parse Claude response: %w", err)
	}

	if claudeResp.Error != nil {
		return "", fmt.Errorf("Claude API error: %s", claudeResp.Error.Message)
	}

	if len(claudeResp.Content) == 0 {
		return "", fmt.Errorf("empty response from Claude")
	}

	return claudeResp.Content[0].Text, nil
}
