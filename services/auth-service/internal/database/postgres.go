package database

import (
	"database/sql"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

var DB *sql.DB

func Connect() {

	err := godotenv.Load()
	port := os.Getenv("PORT")
	postgresql := os.Getenv("DB_URL")

	connStr := postgresql

	db, err := sql.Open("postgres", connStr)

	if err != nil {
		log.Fatal(err)
	}

	DB = db

	log.Println("PostgreSQL Connected", port)
}
