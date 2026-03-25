package database

import (
	"auth-service/internal/models"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect() {
	err := godotenv.Load()
	if err != nil {
		log.Println(".env file not found, using system environment variables")
	}

	// Use DATABASE_URL to match the Node.js service
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		// Fallback to DB_URL for backward compatibility
		dsn = os.Getenv("DB_URL")
	}

	if dsn == "" {
		log.Fatal("DATABASE_URL or DB_URL environment variable is required")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		DisableForeignKeyConstraintWhenMigrating: true, // Handle existing constraints
	})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	DB = db

	Migrate()

	log.Println("PostgreSQL Connected with GORM")
}

func Migrate() {
	log.Println("Starting database migration...")
	
	// Migrate tables one by one to handle constraints properly
	if err := DB.AutoMigrate(&models.User{}); err != nil {
		log.Printf("Warning: User migration failed: %v", err)
	}
	
	if err := DB.AutoMigrate(&models.Allocation{}); err != nil {
		log.Printf("Warning: Allocation migration failed: %v", err)
	}
	
	log.Println("Database migration completed")
}
