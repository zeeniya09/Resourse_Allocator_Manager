package main

import (
	"auth-service/internal/api"
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
		port = "5001" // Use different port to avoid conflict with Node.js service
	}

	log.Println("🔗 Connecting to database...")
	database.Connect()

	app := fiber.New()
	api.SetUpRoutes(app)

	log.Println("🚀 Auth service running on port:", port)
	log.Println("📝 Available endpoints:")
	log.Println("  POST /register - Register new user")
	log.Println("  POST /login - User login")
	log.Println("  GET  /api/profile - Get user profile (protected)")
	log.Println("  POST /api/allocations - Create allocation (protected)")
	log.Println("  GET  /api/allocations - Get user allocations (protected)")
	log.Println("  PUT  /api/allocations/:appName/status - Update allocation status (protected)")
	log.Println("  GET  /api/allocations/stats - Get allocation stats (protected)")
	
	// Start server
	if err := app.Listen(":" + port); err != nil {
		log.Fatal("❌ Server failed to start:", err)
	}
}
