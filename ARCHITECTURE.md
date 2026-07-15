# StreetCircle Project Architecture & File Connections

This document maps out all the file connections across the StreetCircle project, explaining what they do, their flow, and how the frontend and backend talk to each other.

---

## 1. High-Level Flow (Data Flow Overview)
1. **User interacts with UI** (Frontend Components in `frontend/src/components`).
2. **Frontend State & State Operations** manage UI states (Context API & `App.jsx`).
3. **Frontend API Service** (`frontend/src/services/api.js`) sends HTTP requests using Axios to the Node.js backend (`http://localhost:5005/api`).
4. **Backend Entry** (`backend/server.js`) intercepts the HTTP request and routes it to specific `routes`.
5. **Routes** (`backend/routes/`) forward requests to specific functions in the `controllers`.
6. **Controllers** (`backend/controllers/`) handle the core business logic, extracting data using `models`.
7. **Models** (`backend/models/`) define the MongoDB schema structure and handle actual Data-Base read/write/delete ops.

---

## 2. Frontend Architecture (`frontend/src/`)

### Entry Points
- **`main.jsx`**: The root file that renders the React tree into `index.html`. Wraps the `App` with `AuthContext` to give the whole application access to user authentication states.
- **`App.jsx`**: The core component that ties everything together. It holds the main UI layout, holds the primary states (`listings`, `filterType`, `radius`, modal toggle states), and mounts most visual components.

### UI Components (`components/`)
- **`Navbar.jsx`**: Top navigation header. Provides buttons triggering global Modals (Login/Signup & Post a Listing).
- **`Hero.jsx`**: The header banner with search/filter radius controllers and the count string for available community listings.
- **`ListingGrid.jsx`**: Responsible for rendering the community listings or user-specific listings in a card grid format.
- **`PostListingModal.jsx`**: Defines UI for user data-entry to insert new items/skills. Triggers an API POST on submit.
- **`AuthModal.jsx`**: Responsible for user logins/signups. Talks to AuthContext.

### Services (`services/`)
- **`api.js`**: The HTTP bridge to the backend. Defines functions like `getListings`, `createListing`, `getMyListings`, and `deleteListing` which make Axios calls to endpoints on `localhost:5005/api`. Automatically attaches JWT tokens where required.

### Context (`context/`)
- **`AuthContext.js`** (Assuming standard structure): Manages the global variable `user` and the `login`/`logout` wrapper functions so they can be accessed anywhere.

---

## 3. Backend Architecture (`backend/`)

### Entry Point
- **`server.js`**: Initializes the Express app, loads `.env` variables (like Database string and Port), applies Middlewares (CORS, express.json), initiates MongoDB connection using `mongoose`, and registers the main router paths (`/api/listings` and `/api/auth`).

### API Routes (`routes/`)
- **`listingRoutes.js`**: Takes all requests starting with `/api/listings`. Forwards endpoints like `GET /`, `POST /`, `GET /me`, and `DELETE /:id` to their respective functions in the `listingController`.
- **`authRoutes.js`**: Takes all requests starting with `/api/auth`. Maps specific auth paths (login vs signups) to the underlying logic in `authController.js`.

### Controllers (`controllers/`) - *The Brain*
- **`listingController.js`**: Contains functions performing the actual work regarding listings:
  - fetching all items inside a specific radius.
  - storing a newly created item into the DB.
  - restricting deletes to the true owner of a listing.
- **`authController.js`**: Contains login/registration logic. Hashes passwords, checks user credentials against the database, and issues JSON Web Tokens (JWT) for secure authentication across sessions.

### Database Models (`models/`)
- **`Listing.js`**: Mongoose Schema for the items/services posted. Contains fields like Title, Description, Type, Coordinates, and the attached creator's UserID.
- **`User.js`**: Mongoose Schema for system users, enforcing unique emails and storing passwords securely.

### Environment & Config
- **`.env`**: Holds sensitive local secrets and keys. Currently configured to start backend server on `PORT=5005` and points to the MongoDB Atlas connection URL. (Mapped by `server.js`).

---

## 4. Specific File-to-File Call Trees

### Example 1: Loading Community Listings on Initial Load
1. `App.jsx` mounts. `useEffect` calls `fetchCommunityListings()`.
2. Calls `getListings()` in `frontend/src/services/api.js`.
3. GET request hits `backend/server.js` -> routes to `backend/routes/listingRoutes.js`.
4. `listingRoutes` routes it to `getCommunityListings()` located inside `backend/controllers/listingController.js`.
5. The specific controller queries `Listing.find()` inside `backend/models/Listing.js`.
6. Retrieves data back upwards to `App.jsx`, which pushes it into the `listings` state variable and passes properties down into `ListingGrid.jsx` to render visually.

### Example 2: Submitting a new Item
1. User clicks submit in `PostListingModal.jsx` -> invokes `handlePostSubmit` inside `App.jsx`.
2. Passed down to `createListing(newListingData)` inside `services/api.js` mapping it to POST `/api/listings`.
3. Hit `backend/server.js` -> `listingRoutes.js` -> `createListing()` function in `listingController.js`.
4. Controller receives JWT to identify user. Validates the incoming JSON data. Uses `models/Listing.js` to run `.save()`.
5. Returning HTTP 201 Created re-triggers listing fetches on the frontend so users immediately see their new item.

---

## 5. Core React & JavaScript Concepts Used

### React Fundamentals
- **`useState` Hook**: Used extensively in `App.jsx` (e.g., `listings`, `myListings`, `radius`), `AuthContext.jsx` (`user`, `token`), and modal components to manage local component state.
- **`useEffect` Hook**: Used in `App.jsx` to fetch data from the backend on component mount and automatically refetch when map filters change. Also used in `AuthContext.jsx` to synchronize the JWT token with `localStorage`.
- **Context API (`createContext`, `useContext`)**: Declared in `context/AuthContext.jsx` to create a globally accessible state for the authenticated user, bypassing the need for heavy prop drilling. Consumed seamlessly in `App.jsx` and other components.
- **Prop Drilling**: Used to pass data and functions directly from parent `App.jsx` down into children like `Hero.jsx`, `ListingGrid.jsx`, and `PostListingModal.jsx` (e.g., passing `radius`, `setRadius`, `listings`).
- **Conditional Rendering**: Utilized in `App.jsx` to show either the `ListingGrid` or a "Locked/Login Required" screen depending on whether the `user` state exists.
- **Component Lifecycle / Mounting**: Leveraging `main.jsx` to wrap the `App` in an `AuthProvider` for early access to token hydration on the initial browser load.

### Modern JavaScript (ES6+)
- **Destructuring**: Constantly used to neatly unpack object properties (e.g., `const { user } = useContext(AuthContext);` in `App.jsx`, and `const { data } = await axios...` in `services/api.js`).
- **Async/Await & Promises**: Used inside `services/api.js` for clean-looking Axios HTTP requests, and across backend `controllers` to `await` asynchronous MongoDB operations like `.find()`, `.save()`, and `findByIdAndDelete()`.
- **Arrow Functions (`() => {}`)**: Standardized across the entire codebase for functional React components and inline callback functions (like `.map()` in listing grids).
- **JSON Web Tokens (JWT) & Encoding**: Employed in `context/AuthContext.jsx` to handle the session token base64 parsing `atob(token.split(".")[1])` to quickly hydrate user IDs without waiting on an extra API call. Also used heavily in `backend/middleware/authMiddleware.js` for secure endpoint verification.
- **Try/Catch Blocks**: Wrapped around API integration methods in `App.jsx` and JWT checks in `authMiddleware.js` to catch errors gracefully and return safe fallback states or JSON error arrays instead of crashing the server/app.
