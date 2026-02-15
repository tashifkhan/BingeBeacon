package notification

import (
	"context"
	"fmt"
	"log/slog"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"google.golang.org/api/option"
)

type FCMClient struct {
	app    *firebase.App
	client *messaging.Client
	logger *slog.Logger
}

func NewFCMClient(credentialsFile string, logger *slog.Logger) (*FCMClient, error) {
	ctx := context.Background()

	opts := []option.ClientOption{}
	if credentialsFile != "" {
		opts = append(opts, option.WithCredentialsFile(credentialsFile))
	}

	app, err := firebase.NewApp(ctx, nil, opts...)
	if err != nil {
		return nil, fmt.Errorf("error initializing firebase app: %w", err)
	}

	client, err := app.Messaging(ctx)
	if err != nil {
		return nil, fmt.Errorf("error getting messaging client: %w", err)
	}

	return &FCMClient{
		app:    app,
		client: client,
		logger: logger,
	}, nil
}

func (c *FCMClient) SendToDevice(ctx context.Context, token string, title, body string, data map[string]string) error {
	message := &messaging.Message{
		Token: token,
		Notification: &messaging.Notification{
			Title: title,
			Body:  body,
		},
		Data: data,
	}

	response, err := c.client.Send(ctx, message)
	if err != nil {
		return err
	}

	c.logger.Debug("Successfully sent message", "response_id", response)
	return nil
}

func (c *FCMClient) SendToMultiple(ctx context.Context, tokens []string, title, body string, data map[string]string) (*messaging.BatchResponse, error) {
	if len(tokens) == 0 {
		return nil, nil
	}

	message := &messaging.MulticastMessage{
		Tokens: tokens,
		Notification: &messaging.Notification{
			Title: title,
			Body:  body,
		},
		Data: data,
	}

	br, err := c.client.SendMulticast(ctx, message)
	if err != nil {
		return nil, err
	}

	c.logger.Debug("Sent multicast message", "success_count", br.SuccessCount, "failure_count", br.FailureCount)
	return br, nil
}
