# StreetCircle Architecture

## Overview

StreetCircle is a frontend-focused college project with a minimal backend.

```text
React UI (Vite)
  │
  │ Axios + JSON
  ▼
Express API (Node.js)
  │
  │ mysql2 parameterized SQL
  ▼
MySQL
```

## Frontend responsibilities

- Public and logged-in experiences
- Form state and localStorage session
- Listing search and filters
- Responsive layout and accessible modals
- Framer Motion and CSS-based decorative animation
- API calls through `src/services/api.js`

## Backend responsibilities

All API logic lives in `backend/server.js` so it is easy to follow. `backend/db.js` creates the MySQL pool and `backend/schema.sql` creates the two tables.

The backend supports registration, login, listing retrieval, listing creation, personal listing retrieval, and owned listing deletion.

## Database relationship

```text
users.id 1 ──────── * listings.author_id
```

The community feed uses a SQL JOIN to combine listing and author contact data.

## Authentication scope

Passwords are hashed with bcrypt. After login, the browser stores the returned public user object. This is intentionally simplified for a college demonstration and is not presented as production authentication.

## Animation scope

The interface uses Framer Motion, CSS transitions/keyframes, and Intersection Observer. WebGL and overlapping animation libraries were removed to keep the code explainable and the bundle smaller.