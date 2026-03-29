# Frontend Dashboard

The **Frontend Dashboard** handles the user-facing web interface for the **Resource Allocator Manager**. Built with a modern technology stack, it provides users and administrators with secure tooling to manage, monitor, and visualize their Kubernetes allocations.

![Architecture Diagram](../../architecture.png)

## 🛠 Technology Stack

- **Framework:** [Next.js](https://nextjs.org/) (React 19)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Language:** TypeScript
- **Authentication Context:** Global JWT authorization flows enforcing role-based layouts and protected pages
- **Tooling:** ESLint, App Router Architecture

## 🚀 Features

- **Dark Theme Interface:** Implements an aesthetic UI/UX experience complete with dynamic responsive styles.
- **Service Integration:** Communicates with both the Go-based `auth-service` and Node.js-based `resource-allocator-service` via standardized JSON proxy routes.
- **Statistics View:** Clean, metric-driven screens displaying current resource allocations mapped to the current verified user sessions.

## 💻 Getting Started

### Prerequisites

Ensure you have Node.js (v20+) installed on your machine.

### Installation

Install the project dependencies using npm (or bun/yarn):

```bash
npm install
```

### Running the Development Server

Start the local server. *Note: this will start on port 3001 as defined in the package.json by default to prevent port conflicts with typical backend APIs.*

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the outcome. 

Modifying any page in `src/app/` will instantly auto-update using Next.js Fast Refresh.

## 🔗 Environment Variables

This service relies on correctly configured `.env` connections to interact with the Auth API and Resource Allocator API. Verify that endpoints (e.g. `NEXT_PUBLIC_AUTH_SERVICE_URL`) are present and accurate, depending on your overarching setup.

## 📦 Building for Production

To create an optimized production build:

```bash
npm run build
```

Following the build, start the production server:

```bash
npm run start
```
