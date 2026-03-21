package config

import (
	"auth-service/internal/database"
	"auth-service/internal/models"
	"log"
)

func Migrate() {
	err := database.DB.AutoMigrate(
		&models.User{},
		// &models.Admin{},
	)

	if err != nil {
		log.Fatal("❌ Migration failed:", err)
	}

	log.Println("✅ Migration completed")
}
