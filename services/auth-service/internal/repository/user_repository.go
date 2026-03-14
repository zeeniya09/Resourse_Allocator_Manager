package repository

import (
	"auth-service/internal/database"
	"auth-service/internal/models"
)

func CreateUser(user models.User) error {
	query := `Insert into users (id, email, password, created_at) Values ($1, $2. $3, $4)`
	_, err := database.DB.Exec(query, user.ID, user.Email, user.Password, user.CreatedAt)

	return err
}

func FindUserByEmail(email string) (*models.User, error) {
	query := `SELECT id,email,password,created_at FROM users WHERE email=$1`
	row := database.DB.QueryRow(query, email)
	var user models.User

	err := row.Scan(
		&user.ID,
		&user.Email,
		&user.Password,
		&user.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &user, nil{}
}
