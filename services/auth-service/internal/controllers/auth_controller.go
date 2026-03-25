package controllers

import (
	"auth-service/internal/middleware"
	"auth-service/internal/models"
	"auth-service/internal/service"

	"github.com/gofiber/fiber/v2"
)

type AuthRequest struct {
	Email string `json:"email"`
}

type RegisterRequest struct {
	Email string `json:"email"`
}

func Register(c *fiber.Ctx) error {
	req := new(RegisterRequest)
	if err := c.BodyParser(req); err != nil {
		return err
	}
	user, err := service.Register(req.Email)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Registration failed",
			"details": err.Error(),
		})
	}
	return c.JSON(fiber.Map{
		"message": "User created successfully",
		"user": user,
	})
}

func Login(c *fiber.Ctx) error {
	req := new(AuthRequest)
	if err := c.BodyParser(req); err != nil {
		return err
	}
	user, err := service.FindOrCreateUser(req.Email)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{
			"error": "Invalid credentials",
		})
	}
	token, _ := middleware.GenerateToken(user.ID)
	return c.JSON(fiber.Map{
		"token": token,
		"user": user,
	})
}

func GetUserProfile(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	user, err := service.GetUserByID(userID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "User not found",
		})
	}
	return c.JSON(user)
}

// Allocation management endpoints
func CreateAllocation(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	
	var allocation models.Allocation
	if err := c.BodyParser(&allocation); err != nil {
		return err
	}
	
	// Set user ID
	allocation.UserID = userID
	
	result, err := service.CreateAllocation(&allocation)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to create allocation",
			"details": err.Error(),
		})
	}
	
	return c.JSON(fiber.Map{
		"success": true,
		"allocation": result,
	})
}

func GetUserAllocations(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	
	allocations, err := service.GetUserAllocations(userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to get allocations",
			"details": err.Error(),
		})
	}
	
	return c.JSON(fiber.Map{
		"success": true,
		"allocations": allocations,
		"total": len(allocations),
	})
}

func UpdateAllocationStatus(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	appName := c.Params("appName")
	
	var updateData struct {
		Status string `json:"status"`
		URL    string `json:"url,omitempty"`
	}
	
	if err := c.BodyParser(&updateData); err != nil {
		return err
	}
	
	allocation, err := service.UpdateAllocationStatus(userID, appName, updateData.Status, updateData.URL)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to update allocation",
			"details": err.Error(),
		})
	}
	
	return c.JSON(fiber.Map{
		"success": true,
		"allocation": allocation,
	})
}

func GetAllocationStats(c *fiber.Ctx) error {
	stats, err := service.GetAllocationStats()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to get stats",
			"details": err.Error(),
		})
	}
	
	return c.JSON(fiber.Map{
		"success": true,
		"stats": stats,
	})
}
