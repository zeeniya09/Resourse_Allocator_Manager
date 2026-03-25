package middleware

import (
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
)

func GenerateToken(userID string) (string, error) {
	err := godotenv.Load()
	if err != nil {
		return "", err
	}
	jwtSecret := os.Getenv("JWT_SECRET")
	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(time.Hour * 24).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	return token.SignedString(jwtSecret)
}

func AuthRequired() fiber.Handler {
	return func(c *fiber.Ctx) error {
		err := godotenv.Load()
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "Server configuration error",
			})
		}

		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(401).JSON(fiber.Map{
				"error": "Authorization header required",
			})
		}

		tokenString := strings.Replace(authHeader, "Bearer ", "", 1)
		
		jwtSecret := os.Getenv("JWT_SECRET")
		if jwtSecret == "" {
			return c.Status(500).JSON(fiber.Map{
				"error": "JWT secret not configured",
			})
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return []byte(jwtSecret), nil
		})

		if err != nil || !token.Valid {
			return c.Status(401).JSON(fiber.Map{
				"error": "Invalid or expired token",
			})
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return c.Status(401).JSON(fiber.Map{
				"error": "Invalid token claims",
			})
		}

		userID, ok := claims["user_id"].(string)
		if !ok {
			return c.Status(401).JSON(fiber.Map{
				"error": "Invalid user ID in token",
			})
		}

		c.Locals("userID", userID)
		return c.Next()
	}
}
