package service

import (
	"auth-service/internal/database"
	"auth-service/internal/models"
	"errors"
	"time"

	"github.com/google/uuid"
)

func Register(email string) (*models.User, error) {
	// Check if user already exists
	var existingUser models.User
	if err := database.DB.Where("email = ?", email).First(&existingUser).Error; err == nil {
		return nil, errors.New("user already exists")
	}

	user := models.User{
		ID:        uuid.New().String(),
		Email:     email,
		CreatedAt: time.Now(),
	}
	
	if err := database.DB.Create(&user).Error; err != nil {
		return nil, err
	}
	
	return &user, nil
}

func FindOrCreateUser(email string) (*models.User, error) {
	var user models.User
	
	// Try to find existing user
	if err := database.DB.Where("email = ?", email).First(&user).Error; err != nil {
		// User doesn't exist, create new one
		user = models.User{
			ID:        uuid.New().String(),
			Email:     email,
			CreatedAt: time.Now(),
		}
		
		if err := database.DB.Create(&user).Error; err != nil {
			return nil, err
		}
	}
	
	return &user, nil
}

func GetUserByID(userID string) (*models.User, error) {
	var user models.User
	if err := database.DB.Preload("Allocations").Where("id = ?", userID).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// Allocation management functions
func CreateAllocation(allocation *models.Allocation) (*models.Allocation, error) {
	allocation.CreatedAt = time.Now()
	allocation.UpdatedAt = time.Now()
	
	if err := database.DB.Create(allocation).Error; err != nil {
		return nil, err
	}
	
	return allocation, nil
}

func GetUserAllocations(userID string) ([]models.Allocation, error) {
	var allocations []models.Allocation
	if err := database.DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&allocations).Error; err != nil {
		return nil, err
	}
	return allocations, nil
}

func UpdateAllocationStatus(userID, appName, status, url string) (*models.Allocation, error) {
	var allocation models.Allocation
	
	// Find allocation belonging to user
	if err := database.DB.Where("user_id = ? AND app_name = ?", userID, appName).First(&allocation).Error; err != nil {
		return nil, errors.New("allocation not found")
	}
	
	// Update fields
	allocation.Status = status
	allocation.UpdatedAt = time.Now()
	if url != "" {
		allocation.URL = &url
	}
	
	if err := database.DB.Save(&allocation).Error; err != nil {
		return nil, err
	}
	
	return &allocation, nil
}

func GetAllocationStats() (map[string]interface{}, error) {
	var total int64
	var stats []struct {
		Status string
		Count  int64
	}
	
	// Get total count
	if err := database.DB.Model(&models.Allocation{}).Count(&total).Error; err != nil {
		return nil, err
	}
	
	// Get stats by status
	if err := database.DB.Model(&models.Allocation{}).
		Select("status, count(*) as count").
		Group("status").
		Scan(&stats).Error; err != nil {
		return nil, err
	}
	
	// Convert to map
	byStatus := make(map[string]int64)
	for _, stat := range stats {
		byStatus[stat.Status] = stat.Count
	}
	
	return map[string]interface{}{
		"total":    total,
		"byStatus": byStatus,
	}, nil
}
