# StreetCircle Study Guide — React, Express and MySQL Edition

This guide explains the simplified college-project architecture and every important source file.

## 1. Project goal

StreetCircle lets neighbors register, log in, share an item or skill, browse nearby posts, contact an owner, and manage their own listings.

```text
Browser → React → Axios → Express API → mysql2 → MySQL
```

The frontend is the main focus. The backend is intentionally small enough to explain in an interview.

## 2. Technology choices

| Technology | Purpose |
| --- | --- |
| React | Component-based user interface |
| JavaScript | Frontend and backend programming language |
| Axios | Browser-to-server HTTP requests |
| Framer Motion | Component transitions and restrained interactions |
| CSS | Layout, responsive design, radar art, gradients, and animation |
| Intersection Observer | Starts reveal effects when content enters the viewport |
| Node.js | Runs backend JavaScript |
| Express | Defines REST endpoints |
| MySQL | Stores users and listings in related tables |
| mysql2 | Sends parameterized SQL from Node to MySQL |
| bcrypt | Hashes and verifies passwords |

Removed technologies: MongoDB, Mongoose, JWT, Three.js, React Three Fiber, Drei, GSAP, and ScrollTrigger.

---

# Backend

The complete backend has four source/configuration files.

## `backend/package.json`

Defines backend dependencies and commands.

```text
npm start       runs node server.js
npm run dev     runs Node watch mode
```

Dependencies:

- `express`: HTTP API.
- `mysql2`: MySQL connection and queries.
- `bcryptjs`: password hashing.
- `cors`: allows frontend requests.
- `dotenv`: reads `.env`.

## `backend/.env.example`

Documents required local settings:

```env
PORT=5005
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=streetcircle
```

Copy it to `.env` and enter the local MySQL password. `.env` is ignored by Git.

## `backend/db.js`

Creates one reusable MySQL connection pool:

```js
const pool = mysql.createPool({ ... });
module.exports = pool;
```

A pool reuses database connections instead of reconnecting for every request. `connectionLimit: 5` is plenty for a college demonstration.

Values are read from `process.env`, with beginner-friendly localhost defaults.

## `backend/schema.sql`

Creates the database and two tables.

### `users`

```text
id          primary key, auto increment
username    unique login name
password    bcrypt hash
email       contact email
phone       contact number
created_at  automatic timestamp
```

### `listings`

```text
id
listing title and description
type: item or skill
price
latitude and longitude
optional image
author_id foreign key
created_at
```

Relationship:

```text
one user → many listings
```

`ON DELETE CASCADE` means deleting a user also removes that user's listings.

## `backend/server.js`

Contains the entire minimal API.

### Server setup

```js
app.use(cors());
app.use(express.json({ limit: "10mb" }));
```

CORS allows the Vite frontend to call port 5005. JSON parsing reads form/listing bodies. The larger limit supports Base64 image previews.

### `distanceInKm`

Uses the Haversine formula to calculate approximate distance between two latitude/longitude pairs.

### Health endpoint

```text
GET /api/health
```

Runs `SELECT 1`. A successful response confirms Express and MySQL are both working.

### Registration

```text
POST /api/register
```

Flow:

1. Validate required fields.
2. Query username with `SELECT id FROM users WHERE username = ?`.
3. Hash the password using bcrypt.
4. Insert the user.
5. Return public user ID and username.

### Login

```text
POST /api/login
```

Flow:

1. Select the user by username.
2. Compare entered password with stored hash.
3. Return only ID and username.

This simplified college version stores the returned user in browser localStorage. It does not claim production-grade authentication.

### Community listings

```text
GET /api/listings
```

Uses a SQL `JOIN`:

```sql
FROM listings l
JOIN users u ON u.id = l.author_id
```

The join attaches username, email, and phone. JavaScript calculates distance and filters results by radius.

### Create listing

```text
POST /api/listings
```

Runs an `INSERT INTO listings` query with values from the React form.

### Personal listings

```text
GET /api/listings/user/:userId
```

Runs:

```sql
SELECT * FROM listings
WHERE author_id = ?
ORDER BY created_at DESC
```

### Delete listing

```text
DELETE /api/listings/:id
```

The query includes both listing ID and user ID:

```sql
DELETE FROM listings
WHERE id = ? AND author_id = ?
```

This prevents one logged-in browser user from deleting a listing owned by another ID through the normal interface.

### Parameterized queries

Every submitted value is represented by `?` and provided separately:

```js
db.execute("SELECT * FROM users WHERE username = ?", [username]);
```

Do not concatenate form data into SQL strings. Placeholders protect against SQL injection.

---

# Frontend foundation

## `frontend/package.json`

Runtime dependencies are now only:

```text
react
react-dom
axios
framer-motion
```

This makes the project easier to install, build, study, and explain.

## `frontend/index.html`

Contains the React mount element:

```html
<div id="root"></div>
```

Loads `src/main.jsx` and the Remix Icon stylesheet.

## `frontend/vite.config.js`

Registers the React plugin so Vite can process JSX and provide Fast Refresh.

## `frontend/eslint.config.js`

Checks JavaScript and React Hook rules. It ignores production `dist` output.

## `frontend/src/main.jsx`

Mounts React in this hierarchy:

```text
StrictMode
└── AuthProvider
    └── App
```

`AuthProvider` makes the current user available to the entire application.

## `frontend/src/index.css`

The visual design system. It contains:

- Dark editorial colors and typography.
- Responsive layouts.
- CSS neighborhood orb and radar visuals.
- Public preview cards.
- Member dashboard.
- Listing cards and forms.
- Lightweight keyframes.
- Intersection Observer reveal classes.
- Reduced-motion media queries.

The decoration now relies on CSS rather than WebGL.

## `frontend/src/App.css`

Old Vite starter CSS. It is not imported by the application and can be removed after confirming no references.

---

# Frontend data and authentication

## `frontend/src/services/api.js`

Central Axios service.

Functions:

- `getListings(lat, lng, radius, type)`
- `createListing(listingData)`
- `getMyListings(userId)`
- `deleteListing(id, userId)`

Keeping requests here stops components from repeating endpoint code.

## `frontend/src/context/AuthContext.jsx`

Stores the current public user object:

```js
{ id, username }
```

### `login(newUser)`

Saves the user in localStorage and React state.

### `logout()`

Clears localStorage and state.

This is intentionally a simple college-project session, not production security.

---

# Frontend components

## `frontend/src/App.jsx`

Owns global application state:

- community listings
- personal listings
- radius and type filter
- active feed tab
- modal visibility

Effects fetch data after filter or user changes. Mutation handlers create/delete listings and refresh both feeds.

Conditional rendering creates two experiences:

```text
logged out → PublicPreview
logged in  → MemberHub + ListingGrid
```

## `frontend/src/components/Navbar.jsx`

Shows the logo and different actions based on login state. Uses the lightweight `MagneticButton` name, which now performs only a simple Framer hover lift and press scale.

## `frontend/src/components/Hero.jsx`

Contains the headline, explanation, radius buttons, nearby count, and `HeroGraphic`.

Changing a radius button updates App state and causes a listing refetch.

## `frontend/src/components/HeroGraphic.jsx`

A decorative CSS-based neighborhood orb.

It includes:

- Rotating CSS rings.
- Activity nodes.
- Center icon.
- Floating signal cards using Framer Motion.

It preserves the creative look without Three.js or WebGL.

## `frontend/src/components/Motion.jsx`

Small reusable animation module.

### `AnimatedBackground`

Renders grid and gradient layers.

### `LoadingOverlay`

Runs a short logo, title, and progress reveal.

### `ScrollExperience`

Uses browser `IntersectionObserver` to add `is-visible` when headings, dashboard sections, and cards enter the viewport.

This replaces GSAP ScrollTrigger with a standard browser API.

### `MagneticButton`

The historical component name remains so other files need fewer changes. It now uses only a subtle Framer Motion hover and tap animation; it no longer calculates pointer physics.

## `frontend/src/components/PublicPreview.jsx`

Creative logged-out preview with sample neighborhood cards and a CSS radar.

The cards no longer drag. They use only hover motion, making the interaction predictable and easy to explain.

## `frontend/src/components/MemberHub.jsx`

Logged-in dashboard with:

- personalized greeting
- nearby listing count
- personal listing count
- skill count
- decorative activity radar
- quick post button
- feed navigation shortcuts

The radar is presented as an activity visualization, not a geographically accurate map.

## `frontend/src/components/ListingGrid.jsx`

Derives visible listings by:

1. excluding the member's own posts from community mode
2. filtering item/skill type
3. filtering title/description search text

It renders cards, tabs, filters, search, empty states, and the contact modal.

## `frontend/src/components/ListingCard.jsx`

Displays one listing. It uses simple Framer Motion entrance and hover elevation rather than GSAP tilt or pointer-tracked glow.

Shows Delete for personal listings and Contact for community listings.

## `frontend/src/components/AuthModal.jsx`

One controlled form for login and registration.

It calls:

```text
POST /api/login
POST /api/register
```

On success, the returned user is saved through `AuthContext.login`.

## `frontend/src/components/PostListingModal.jsx`

Collects title, description, type, price, and image.

`FileReader` converts an uploaded file into a Base64 preview. This is acceptable for a small college demo but production applications should use image storage.

## `frontend/src/components/ContactModal.jsx`

Displays email and phone returned from the SQL `JOIN` in the community listing response.

---

# Main flows to explain in an interview

## Register

```text
AuthModal
→ Axios POST /api/register
→ Express validates fields
→ SELECT checks duplicate username
→ bcrypt hashes password
→ INSERT creates user
→ returned user saved in AuthContext
```

## Load listings

```text
App effect
→ api.getListings
→ Express GET /api/listings
→ SQL JOIN listings and users
→ calculate distances
→ React state
→ ListingGrid filters
→ ListingCard renders
```

## Create listing

```text
PostListingModal
→ App adds location and user ID
→ POST /api/listings
→ parameterized INSERT
→ App refreshes feeds
```

## Delete listing

```text
ListingCard Delete
→ DELETE endpoint with listing and user IDs
→ SQL DELETE checks both IDs
→ App refreshes feeds
```

---

# Resume framing

Describe this as:

> A frontend-focused full-stack college project with a minimal Express and MySQL backend.

Primary skills:

```text
React.js
JavaScript
Responsive Web Design
UI/UX Design
Framer Motion
CSS Animation
Axios
REST API Integration
```

Secondary skills:

```text
Node.js
Express.js
MySQL
SQL
bcrypt
Git
GitHub
```

Do not claim MongoDB, Mongoose, JWT, Three.js, GSAP, or advanced backend security for this version.

---

# Limitations

- localStorage user sessions are demonstration-level, not production authentication
- user IDs sent by the browser are not strong authorization
- Base64 images can make requests/database rows large
- the location is currently a fixed MVP coordinate
- no automated tests or pagination
- CORS is open for local development

Being able to identify these limitations is valuable in an interview.