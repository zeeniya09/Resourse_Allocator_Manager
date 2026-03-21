package main

import (
	"auth-service/internal/api"
	"auth-service/internal/config"
	"auth-service/internal/database"
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println(".env file not found, using system environment variables")
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	database.Connect()
	config.Migrate()

	app := fiber.New()
	api.SetUpRoutes(app)

	log.Println("Server running on port:", port)
	// Start server
	if err := app.Listen(":" + port); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
