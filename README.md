# StreetCircle

An immersive, hyperlocal sharing platform for exchanging useful items and community skills with nearby neighbors.

StreetCircle combines a functional MERN marketplace with an editorial, motion-led interface. Visitors receive an interactive public preview before joining, while authenticated members receive a personalized neighborhood command center, live listing statistics, search, filtering, contact details, and listing management.

## Highlights

### Public experience

- Full-screen animated introduction and logo reveal
- Interactive React Three Fiber neighborhood scene
- GSAP ScrollTrigger section and typography reveals
- Draggable neighborhood activity cards
- Animated local radar and discovery preview
- Magnetic calls to action, ripple feedback, and custom cursor
- Responsive layouts and reduced-motion fallbacks

### Member experience

- JWT-based registration and login
- Personalized member greeting preserved across refreshes
- Interactive neighborhood activity map
- Nearby listing, personal share, and skill statistics
- Community and personal listing feeds
- Search, distance, and listing-type filters
- Create listings with image previews
- Contact neighbors and manage personal listings

### Development reliability

- MongoDB Atlas is used whenever it is reachable
- Persistent local JSON storage is used automatically during local development when Atlas is unavailable
- Passwords remain bcrypt-hashed in both storage modes
- API contracts remain identical between MongoDB and local storage

## Technology

- React 19 and Vite
- Framer Motion
- GSAP and ScrollTrigger
- Three.js
- React Three Fiber and Drei
- Axios
- Node.js and Express
- MongoDB and Mongoose
- JSON Web Tokens and bcrypt

## Project structure

```text
Street-Circle/
├── backend/
│   ├── controllers/        # Authentication and listing operations
│   ├── middleware/         # JWT route protection
│   ├── models/             # Mongoose user and listing models
│   ├── routes/             # Express API routes
│   ├── devStore.js         # Persistent local development fallback
│   └── server.js           # Backend entry point
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/     # UI, motion, member, public, and 3D components
│       ├── context/        # Authentication state
│       ├── services/       # API client
│       ├── App.jsx
│       └── index.css
└── ARCHITECTURE.md
```

## Local setup

### Requirements

- Node.js 20.19 or newer
- npm
- Optional: a MongoDB Atlas connection string

### 1. Clone the repository

```bash
git clone https://github.com/Raghav131104/Street-Circle.git
cd Street-Circle
```

### 2. Configure the backend

Create `backend/.env`:

```env
PORT=5005
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=replace_with_a_long_random_secret
```

`MONGO_URI` is optional for local development. If MongoDB cannot be reached, StreetCircle starts with persistent local storage in `backend/.local-data.json`. This file and `.env` are ignored by Git.

### 3. Start the backend

```powershell
cd backend
npm.cmd install
node server.js
```

Expected output:

```text
Server running on port 5005
Connected to MongoDB
```

When MongoDB is unavailable, the server instead reports that persistent local development storage is active.

### 4. Start the frontend

Open another terminal from the repository root:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev -- --configLoader runner
```

Open the URL printed by Vite, normally [http://localhost:5173](http://localhost:5173).

The `runner` config loader avoids Windows file-locking issues that can affect Vite's temporary configuration directory.

## API endpoints

| Method | Endpoint | Purpose | Authentication |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Check API and active storage mode | No |
| `POST` | `/api/auth/register` | Create an account | No |
| `POST` | `/api/auth/login` | Log in and receive a JWT | No |
| `GET` | `/api/listings` | Get nearby listings | No |
| `POST` | `/api/listings` | Create a listing | Yes |
| `GET` | `/api/listings/me` | Get the current member's listings | Yes |
| `DELETE` | `/api/listings/:id` | Delete an owned listing | Yes |

## Production build

```powershell
cd frontend
npm.cmd run build
```

The Three.js experience is lazy-loaded into a separate bundle so initial content can become interactive before the WebGL scene finishes loading.

## Accessibility and performance

- Honors `prefers-reduced-motion`
- Simplifies pointer effects on touch devices
- Uses a low-power WebGL context and limited device pixel ratio
- Caps the particle count in the Three.js scene
- Cleans up GSAP animations and ScrollTriggers on unmount
- Supports visible keyboard focus and semantic form controls

## Repository

[github.com/Raghav131104/Street-Circle](https://github.com/Raghav131104/Street-Circle)