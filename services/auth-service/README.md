# Go Auth Service

A Go-based authentication and allocation management service that works alongside the Node.js resource allocator service.

## 🚀 Features

### **Authentication**
- ✅ **Passwordless Auth** - Email-based authentication (no passwords required)
- ✅ **JWT Tokens** - Secure token-based authentication
- ✅ **Auto-registration** - Users are created automatically on first login

### **Allocation Management**
- ✅ **Create Allocations** - Track pod allocations in database
- ✅ **User Allocations** - Get allocations for authenticated users
- ✅ **Status Updates** - Update allocation lifecycle status
- ✅ **Statistics** - Get allocation statistics and metrics

## 📊 Database Schema

The service shares the same PostgreSQL database as the Node.js service:

### **Users Table**
```sql
- id (UUID, Primary Key)
- email (String, Unique)
- created_at (DateTime)
- updated_at (DateTime)
```

### **Allocations Table**
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- app_name (String, Unique)
- status (String) - CREATING, DEPLOYING, RUNNING, STOPPED, FAILED, DELETED
- node (String, Nullable)
- cpu (Integer, Default: 200)
- memory (Integer, Default: 256)
- image (String, Default: "nginx")
- port (Integer, Default: 80)
- url (String, Nullable)
- deployment_id (String, Nullable)
- service_id (String, Nullable)
- ingress_id (String, Nullable)
- created_at (DateTime)
- updated_at (DateTime)
```

## 🔧 Setup Instructions

### 1. Environment Configuration
```bash
# Copy environment file
cp .env.example .env

# Update DATABASE_URL to match your PostgreSQL database
DATABASE_URL="postgresql://username:password@localhost:5432/resource_allocator?schema=public"
PORT=5001
JWT_SECRET="your-super-secret-jwt-key"
```

### 2. Install Dependencies
```bash
go mod download
```

### 3. Run the Service
```bash
go run cmd/main.go
```

### 4. Build for Production
```bash
go build -o auth-service cmd/main.go
./auth-service
```

## 📝 API Endpoints

### **Public Endpoints**

#### Register User
```bash
POST /register
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### User Login
```bash
POST /login
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "created_at": "2026-03-25T10:30:00Z",
    "updated_at": "2026-03-25T10:30:00Z"
  }
}
```

### **Protected Endpoints** (Require JWT Token)

#### Get User Profile
```bash
GET /api/profile
Authorization: Bearer <jwt-token>
```

#### Create Allocation
```bash
POST /api/allocations
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "app_name": "user-123456789-chatanya",
  "status": "CREATING",
  "node": "worker-node-1",
  "cpu": 200,
  "memory": 256,
  "image": "nginx",
  "port": 80
}
```

#### Get User Allocations
```bash
GET /api/allocations
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "allocations": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "user-id-here",
      "app_name": "user-123456789-chatanya",
      "status": "RUNNING",
      "node": "worker-node-1",
      "cpu": 200,
      "memory": 256,
      "image": "nginx",
      "port": 80,
      "url": "http://user-123456789-chatanya.127.0.0.1.nip.io:8080",
      "created_at": "2026-03-25T10:30:00Z",
      "updated_at": "2026-03-25T10:35:00Z"
    }
  ],
  "total": 1
}
```

#### Update Allocation Status
```bash
PUT /api/allocations/{appName}/status
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "status": "RUNNING",
  "url": "http://user-123456789-chatanya.127.0.0.1.nip.io:8080"
}
```

#### Get Allocation Statistics
```bash
GET /api/allocations/stats
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 5,
    "byStatus": {
      "RUNNING": 3,
      "CREATING": 1,
      "FAILED": 1
    }
  }
}
```

## 🔒 Authentication

### **JWT Token Usage**
Include the JWT token in the Authorization header:
```bash
Authorization: Bearer <your-jwt-token>
```

### **Token Payload**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "exp": 1640995200,
  "iat": 1640991600
}
```

## 🛠 Integration with Node.js Service

The Go auth service is designed to work alongside the Node.js resource allocator:

1. **Shared Database** - Both services use the same PostgreSQL database
2. **Complementary APIs** - Go handles auth/allocation tracking, Node.js handles K8s operations
3. **Consistent Schema** - Both services use identical data models
4. **Separate Ports** - Go runs on 5001, Node.js runs on 5000

### **Typical Workflow**
1. User authenticates with Go service (`/login`)
2. Go service returns JWT token
3. Node.js service validates JWT token (if integrated)
4. Node.js creates K8s resources and updates database
5. Go service provides allocation management APIs

## 🐳 Docker Support

```bash
# Build Docker image
docker build -t auth-service .

# Run with Docker
docker run -p 5001:5001 --env-file .env auth-service
```

## 🔧 Development

### **Project Structure**
```
auth-service/
├── cmd/
│   └── main.go              # Application entry point
├── internal/
│   ├── api/                 # Route definitions
│   ├── config/              # Configuration
│   ├── controllers/         # HTTP handlers
│   ├── database/            # Database connection
│   ├── middleware/          # JWT middleware
│   ├── models/              # Data models
│   ├── repository/          # Data access layer
│   └── service/             # Business logic
├── go.mod                   # Go modules
├── go.sum                   # Go dependencies
├── Dockerfile               # Docker configuration
└── .env.example             # Environment template
```

### **Dependencies**
- **Fiber** - Fast web framework
- **GORM** - ORM for PostgreSQL
- **JWT** - Token-based authentication
- **UUID** - Unique identifier generation

## 🚀 Production Deployment

1. **Set strong JWT secret**
2. **Use HTTPS in production**
3. **Configure database connection pooling**
4. **Set up proper logging and monitoring**
5. **Use environment variables for all configuration**

## 📝 Notes

- Service uses passwordless authentication for simplicity
- Database migrations are handled automatically by GORM
- JWT tokens expire after 24 hours (configurable)
- All allocation operations require valid authentication
