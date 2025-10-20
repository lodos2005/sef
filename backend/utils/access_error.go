package utils

import "github.com/gofiber/fiber/v3"

type AccessError struct{}

func (e *AccessError) Error() string {
	return "Access Denied"
}

func NewAccessError() *AccessError {
	return &AccessError{}
}

func NewAuthError() error {
	return fiber.NewError(fiber.StatusUnauthorized, "Unauthorized")
}
