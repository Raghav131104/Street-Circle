# StreetCircle

StreetCircle is a frontend-focused college project for sharing items and skills with nearby neighbors. It combines a creative React interface with a deliberately small Express and MySQL backend that is easy to study and explain.

## Features

- Separate public preview and logged-in member dashboard
- Registration and login with bcrypt password hashing
- Community and personal listing feeds
- Create and delete owned listings
- Search, item/skill filters, and distance filters
- Image preview and neighbor contact details
- Responsive editorial design
- Lightweight Framer Motion and CSS animations
- Reduced-motion accessibility

## Technology

### Frontend

- React and JavaScript
- Axios
- Framer Motion
- CSS animations and Intersection Observer
- Vite

### Backend

- Node.js and Express
- MySQL using `mysql2`
- bcrypt password hashing
- Parameterized SQL queries

The project intentionally does not use MongoDB, Mongoose, JWT, Three.js, GSAP, or ScrollTrigger.

## Architecture

```text
React frontend
      │ Axios JSON requests
      ▼
Minimal Express API
      │ Parameterized SQL
      ▼
MySQL database
```

## Project structure

```text
Street-Circle/
├── backend/
│   ├── db.js          # MySQL connection pool
│   ├── schema.sql     # users and listings tables
│   ├── server.js      # all six API endpoints
│   ├── .env.example
│   └── package.json
├── frontend/
│   └── src/
│       ├── components/
│       ├── context/
│       ├── services/
│       ├── App.jsx
│       └── index.css
└── STUDY.md
```

## MySQL setup

1. Install and start MySQL.
2. Run `backend/schema.sql` using MySQL Workbench or the command line:

```powershell
mysql -u root -p < backend/schema.sql
```

3. Copy the example configuration:

```powershell
Copy-Item backend/.env.example backend/.env
```

4. Put your MySQL password in `backend/.env`.

## Run the backend

```powershell
cd backend
npm.cmd install
npm.cmd start
```

The API starts at `http://localhost:5005`.

## Run the frontend

In another terminal:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev -- --configLoader runner
```

Open the URL printed by Vite.

## API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check MySQL connection |
| `POST` | `/api/register` | Register a user |
| `POST` | `/api/login` | Log in |
| `GET` | `/api/listings` | Get nearby listings |
| `POST` | `/api/listings` | Create a listing |
| `GET` | `/api/listings/user/:userId` | Get one user's listings |
| `DELETE` | `/api/listings/:id` | Delete an owned listing |

## Database

The `users` table stores account details and bcrypt password hashes. The `listings` table stores item/skill posts and uses `author_id` as a foreign key to `users.id`.

All values are passed through `?` placeholders rather than being inserted into SQL strings. This makes the queries easier to read and protects against SQL injection.

## Resume summary

> Built a responsive community marketplace using React, JavaScript, Node.js, Express, and MySQL. Implemented registration and login, item and skill listings, search and distance filters, image previews, contact details, and personal listing management. Created a modern editorial interface with Framer Motion and lightweight CSS animations, supported by a minimal REST API using parameterized SQL queries and bcrypt password hashing.