package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID        string         `gorm:"type:uuid;primaryKey" json:"id"`
	Email     string         `gorm:"uniqueIndex;not null" json:"email"`
	CreatedAt time.Time      `gorm:"autoCreateTime;column:createdAt" json:"createdAt"`
	Allocations []Allocation `json:"allocations,omitempty"`
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
	UserID       string    `gorm:"type:uuid;not null;index;column:userId" json:"userId"`
	AppName      string    `gorm:"uniqueIndex;not null;column:appName" json:"appName"`
	Status       string    `gorm:"default:'CREATING';column:status" json:"status"` // CREATING, DEPLOYING, RUNNING, STOPPED, FAILED, DELETED
	Node         *string   `gorm:"column:node" json:"node"`
	CPU          int       `gorm:"default:200;column:cpu" json:"cpu"`
	Memory       int       `gorm:"default:256;column:memory" json:"memory"`
	Image        string    `gorm:"default:'nginx';column:image" json:"image"`
	Port         int       `gorm:"default:80;column:port" json:"port"`
	URL          *string   `gorm:"column:url" json:"url"`
	DeploymentID *string   `gorm:"column:deploymentId" json:"deploymentId"`
	ServiceID    *string   `gorm:"column:serviceId" json:"serviceId"`
	IngressID    *string   `gorm:"column:ingressId" json:"ingressId"`
	CreatedAt    time.Time `gorm:"autoCreateTime;column:createdAt" json:"createdAt"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime;column:updatedAt" json:"updatedAt"`
	
	// Relationships
	User User `gorm:"constraint:OnDelete:CASCADE" json:"user,omitempty"`
}

func (a *Allocation) BeforeCreate(tx *gorm.DB) (err error) {
	if a.ID == "" {
		a.ID = uuid.New().String()
	}
	return
}
