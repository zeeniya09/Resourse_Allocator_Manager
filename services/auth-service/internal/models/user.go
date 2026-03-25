package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID        string         `gorm:"type:uuid;primaryKey" json:"id"`
	Email     string         `gorm:"uniqueIndex;not null" json:"email"`
	CreatedAt time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	Allocations []Allocation `gorm:"foreignKey:UserID" json:"allocations,omitempty"`
}

func (u *User) BeforeCreate(tx *gorm.DB) (err error) {
	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	return
}

// Allocation model to match Prisma schema
type Allocation struct {
	ID           string    `gorm:"type:uuid;primaryKey" json:"id"`
	UserID       string    `gorm:"type:uuid;not null;index" json:"user_id"`
	AppName      string    `gorm:"uniqueIndex;not null" json:"app_name"`
	Status       string    `gorm:"default:'CREATING'" json:"status"` // CREATING, DEPLOYING, RUNNING, STOPPED, FAILED, DELETED
	Node         *string   `json:"node"`
	CPU          int       `gorm:"default:200" json:"cpu"`
	Memory       int       `gorm:"default:256" json:"memory"`
	Image        string    `gorm:"default:'nginx'" json:"image"`
	Port         int       `gorm:"default:80" json:"port"`
	URL          *string   `json:"url"`
	DeploymentID *string   `json:"deployment_id"`
	ServiceID    *string   `json:"service_id"`
	IngressID    *string   `json:"ingress_id"`
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime" json:"updated_at"`
	
	// Relationships
	User User `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
}

func (a *Allocation) BeforeCreate(tx *gorm.DB) (err error) {
	if a.ID == "" {
		a.ID = uuid.New().String()
	}
	return
}
