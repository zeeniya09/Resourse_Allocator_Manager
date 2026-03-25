package api

import (
	"auth-service/internal/controllers"
	"auth-service/internal/middleware"

	"github.com/gofiber/fiber/v2"
)

func SetUpRoutes(app *fiber.App) {
	// Auth routes (public)
	app.Post("/register", controllers.Register)
	app.Post("/login", controllers.Login)
	
	// Protected routes
	api := app.Group("/api", middleware.AuthRequired())
	
	// User routes
	api.Get("/profile", controllers.GetUserProfile)
	
	// Allocation routes
	api.Post("/allocations", controllers.CreateAllocation)
	api.Get("/allocations", controllers.GetUserAllocations)
	api.Put("/allocations/:appName/status", controllers.UpdateAllocationStatus)
	api.Get("/allocations/stats", controllers.GetAllocationStats)
}
