# 🏙️ StreetCircle

StreetCircle is a full-stack MERN (MongoDB, Express, React, Node) hyperlocal marketplace application. It allows users to create accounts, browse nearby items and skills based on real-time mathematical geolocation, and contact neighbors.

---

## 🚀 How to Start the Project
If you close your terminal or restart your computer, follow these exact steps to boot the application back up.

### Step 1: Start the Backend (Server & Database)
Open a new Terminal window or Command Prompt, and run:
```bash
cd Desktop\StreetCircle\backend
npm start
```
*Wait until you see:* `Server running on port 5005` and `Connected to MongoDB`.

### Step 2: Start the Frontend (User Interface)
Open a **second, separate** Terminal window, and run:
```bash
cd Desktop\StreetCircle\frontend
npm run dev
```
*Wait until you see:* `➜  Local:   http://localhost:5173/`. 
Hold **`Ctrl`** and click that link to open StreetCircle in your browser.

---

## 🏗️ System Architecture
The application works synchronously through a robust MERN stack workflow:
1. **Frontend (Vite/React):** The visual interface the user interacts with. It asks the backend for data.
2. **Backend (Node.js/Express):** The middleman server logic. It securely receives requests, checks conditions (like passwords or distances), and talks to the database.
3. **Database (MongoDB Atlas):** The cloud storage network holding all `users` and `listings` data.

---

## 📂 File Explanations & Workflow

### 1. The Backend (Node.js / Express)
The backend is fundamentally responsible for security, data storage, and executing complex math queries (like Geographic proximity).

*   `server.js`: The central entry point. It boots up the local server on Port `5005`, actively connects to your MongoDB Cloud cluster, and opens up CORS (Cross-Origin Resource Sharing) which permits your Frontend (`5173`) to talk to your Backend safely.
*   **`models/` (Data Blueprints)**
    *   `User.js`: Tells MongoDB how to shape a User (username, email, phone, encrypted password).
    *   `Listing.js`: Shapes the listing structure. Crucially, it sets a MongoDB `2dsphere` geographic index on the location field so we can measure exact earth distances.
*   **`middleware/` (Security Checkpoints)**
    *   `authMiddleware.js`: Acts like a bouncer. Before running any protected commands (like attempting to delete a post), it checks if an authentic JWT (JSON Web Token) is present in the headers.
*   **`controllers/` (The Business Logic)**
    *   `authController.js`: Handles registration. Before saving passwords, it hashes/scrambles them using `bcrypt`.
    *   `listingController.js`: Handles our biggest database queries. `getListings` utilizes MongoDB's `$near` operator to perfectly calculate the radius distance of posts from your location. `createListing` handles converting your uploaded images into secure Base64 text strings to be saved locally.
*   **`routes/` (URL Paths)**
    *   Creates URLs like `/api/auth/register` to route the internet traffic to the correct `controller`.

### 2. The Frontend (React.js)
The frontend manages state, user experience, and animations.

*   `App.jsx`: The "Brain" of the interface. 
    *   It holds the Central States (e.g., `radius` filter size, `listings` array, `user` credentials).
    *   When it loads (`useEffect`), it orders `services/api.js` to fetch listings.
    *   It passes data downward into the visual components.
*   `context/AuthContext.jsx`: Prevents the user from being logged out on refresh. It persistently saves the JWT token into your browser's `localStorage` and continuously wraps the application to say "Yes, this person is logged in".
*   `services/api.js`: A dedicated folder that uses `Axios` to manage HTTP connections to the backend server. If you ever deploy the website online, you only need to change the `API_URL` here.
*   **`components/` (Interface Building Blocks)**
    *   `ListingGrid.jsx`: The filtering engine. It receives the raw array of listings from `App.jsx` and runs live Javascript `.filter()` loops across them whenever you type in the search bar or switch between `Community` and `Mine` tabs.
    *   `ListingCard.jsx`: Renders the specific card UI. Uses conditional rendering (`isMine`) to decide whether to show a generic pink "Delete Button" or a green "Contact" button.
    *   `HeroGraphic.jsx`: The animated Right-side screen UI. Completely powered by structural CSS and `framer-motion` variant arrays that tell the computer to automatically repeat subtle Y-axis transforms.
    *   `ContactModal.jsx` / `AuthModal.jsx`: Fixed position UI overlays with glassmorphic background blurs (`backdrop-filter: blur()`). They receive data and block the background layout until successfully closed.
    *   `index.css`: The central styling hub. It features CSS Variables, modern grid layouts, and advanced glass properties (Frost textures that adapt cleanly under component movement).

---

## 🔀 Step-by-Step Code Walkthrough (Example)
**What happens mathematically when you click "Contact Owner"?**

1.  **React State (`ListingGrid.jsx`)**: You click the button on `ListingCard.jsx`. It passes the event up and sets `contactInfo` to the author of that post.
2.  **Modal Trigger (`ContactModal.jsx`)**: React notices `contactInfo` is no longer null, mounting `ContactModal.jsx` instantly on screen.
3.  **UI Data Mapping**: The modal takes the `user.phone` and `user.email` data variables (which were already securely populated during the `fetchCommunityListings` backend query via Mongoose's `.populate()`) and prints them onto beautifully styled glassmorphic panels!
