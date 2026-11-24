# E-commerce REST API

A backend REST API for a basic e-commerce application, built with **Node.js, Express 5, MongoDB/Mongoose and JWT**.

- **Users:** registration, login, profile, roles (`admin` / `customer`), admin can activate/deactivate users
- **Categories:** unlimited nesting, full tree endpoint, protection against circular parent/child relations
- **Products:** admin CRUD, customer listing with search, category / price filters, sorting and pagination
- **Orders:** server-side pricing, stock validation and atomic stock reduction, status workflow, per-customer privacy

## Quick start

Requirements: Node.js 20+ (22 tested) and a running MongoDB (local or Atlas).

```bash
npm install
cp .env.example .env        # then edit MONGO_URI, JWT_SECRET and the ADMIN_* values
npm run seed:admin          # creates the first admin account from ADMIN_* in .env
npm run dev                 # development (nodemon)   |   npm start  for plain node
```

The API runs on `http://localhost:5000` (or `PORT`). Public registration only ever creates **customers**, so the admin has to be created with the seed script.

### Docker

```bash
cp .env.example .env                                  # set JWT_SECRET and the ADMIN_* values
docker compose up --build                             # API on http://localhost:5000 plus its own MongoDB
docker compose exec api npm run seed:admin            # creates the first admin
```

`MONGO_URI` is overridden by `docker-compose.yml` to point at the bundled database, so whatever is in `.env` is ignored for it.

### Tests

```bash
npm test
```

Integration tests (`tests/api.test.js`) run the real app against an in-memory MongoDB (downloaded on first run). They cover auth and roles, the category tree and circular-parent checks, product filters, and orders (server-side pricing, stock, overselling race, privacy, status flow, restock on cancel).

### Environment variables

Copy [.env.example](.env.example) to `.env` and edit the values:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB connection string (local or Atlas)
MONGO_URI=mongodb://localhost:27017/ecommerce

# JWT - use a long random string
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=1d

# First admin account, created by `npm run seed:admin`
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin@123

# Rate limiting (window is shared by both limiters)
RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_MAX=300
AUTH_RATE_LIMIT_MAX=20
```

| Variable | Purpose |
| --- | --- |
| `PORT` | Port the API listens on (default `5000`) |
| `NODE_ENV` | `development` or `production` |
| `MONGO_URI` | MongoDB connection string (local or Atlas) |
| `JWT_SECRET` | Token signing secret. Required, the server refuses to start without it. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `1d` |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Used by `npm run seed:admin` to create the first admin |
| `RATE_LIMIT_WINDOW_MINUTES` | Rate-limit window, shared by both limiters |
| `RATE_LIMIT_MAX` | Max requests per window for the whole API |
| `AUTH_RATE_LIMIT_MAX` | Max requests per window for login/register |

## Documentation

- **Postman:** [docs/postman_collection.json](docs/postman_collection.json) covers every endpoint and is written for the sample data (`npm run seed:data`: an Electronics category tree and 10 products) plus the admin from `npm run seed:admin`. Import it, set `adminEmail` / `adminPassword` if yours differ, and run the folders top to bottom (Auth, Users, Categories, Products, Orders, Cleanup). Seeded categories and products are looked up by name / SKU, and tokens and ids are saved to collection variables by test scripts, so no copy-pasting is needed. Requests are named `Action Resource (Role)`; ones that expect the API to refuse use a dash, e.g. `Create Product - Forbidden for Customer`. A full run adds one customer and places two orders (stock of the ordered products changes).

## Endpoints

All routes are under `/api`. Send `Authorization: Bearer <token>` where auth is required.

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | public | Register a customer |
| POST | `/auth/login` | public | Log in, returns a JWT |
| GET | `/auth/me` | any user | Current profile |
| PUT | `/users/me` | any user | Update own name / password |
| GET | `/users` | admin | List users (`role`, `isActive`, `search`, `page`, `limit`) |
| GET | `/users/:id` | admin | Get a user |
| PATCH | `/users/:id/status` | admin | Activate / deactivate a user |
| GET | `/categories/tree` | public | Full nested category tree |
| GET | `/categories` | public | Flat list (`?parent=<id>` or `?parent=null` for roots) |
| GET | `/categories/:id` | public | One category |
| POST | `/categories` | admin | Create (optionally with `parent`) |
| PUT | `/categories/:id` | admin | Update / move (`parent`) |
| DELETE | `/categories/:id` | admin | Delete (blocked if it has children or products) |
| GET | `/products` | public | Storefront listing: `search`, `category`, `minPrice`, `maxPrice`, `sort`, `page`, `limit` |
| GET | `/products/:id` | public | Product details (inactive ones: admin only) |
| GET | `/products/admin/all` | admin | Listing including inactive products |
| POST / PUT / DELETE | `/products`, `/products/:id` | admin | Manage products |
| POST | `/orders` | customer | Place an order |
| GET | `/orders/my`, `/orders/my/:id` | customer | Own orders only |
| PATCH | `/orders/my/:id/cancel` | customer | Cancel own order while it is still `pending` |
| GET | `/orders`, `/orders/:id` | admin | All orders (`status`, `user` filters) |
| PATCH | `/orders/:id/status` | admin | Move an order through the status workflow |

Successful responses look like `{ "status": "success", "message": "...", "data": ..., "pagination": ... }`. Errors always look like `{ "status": "error", "message": "...", "errors": [{ "field": "...", "message": "..." }] }` with an appropriate status code (400, 401, 403, 404, 409, 429, 500).

`sort` values: `newest` (default), `oldest`, `price_asc`, `price_desc`, `name_asc`, `name_desc`.

## Project structure

Code is grouped by feature. Every module has the same five files:

```
server.js                  starts the server
src/
  app.js                   middleware, then the routes of each module, then error handling
  config/db.js             MongoDB connection
  database/
    models/                Mongoose models: user, category, product, order
    seeders/               seedAdmin (first admin), seedData (sample data)
  middleware/              auth, authorize, validate, rate limiters, error handler
  utils/                   appError, asyncHandler, password, slug, query (pagination + search helpers)
  validators/              reusable validation rules
  modules/
    auth/                  register, login, "me"
    users/                 admin user management, own profile
    categories/            multi-level categories
    products/              products, search, filters
    orders/                orders, stock, status flow
tests/                     integration tests (node:test + supertest)
Dockerfile, docker-compose.yml   container setup
docs/                      Postman collection
```

Inside a module, a request flows through these files in order:

| File | Job |
| --- | --- |
| `*Routes.js` | Maps a URL to a list of steps: login check, role check, validation, controller |
| `*Validators.js` | Checks the request input (express-validator) |
| `*Controller.js` | A class with static handlers. Reads the request, calls the service, sends the response with `res.status(...).json(...)`. No business logic |
| `*Service.js` | A class with static methods. All the business rules and database work |
| `database/models/*Model.js` | The Mongoose schema and indexes only (no hooks) |

## How it works

**Auth.** Passwords are hashed with bcrypt and the login returns a JWT. The role is never read from the request, so public sign-up always creates a customer. The user is loaded from the database on every request, so deactivating an account works immediately.

**Categories.** Each category stores its `parent` and an `ancestors` list (every category above it). This gives unlimited depth with simple queries:
- The tree is built in memory from one query.
- "Everything under X" is one query: `{ ancestors: X }`. The product filter uses it to include sub-categories.
- A category cannot become its own parent or move under one of its descendants (checked through `ancestors`).
- Two siblings cannot share a name. A category with children or products cannot be deleted.

**Orders and stock.** The client sends only product ids and quantities. Name, SKU, price and totals come from the database, and the order keeps a copy of them. To place an order:
1. Check that every product exists and has enough stock (the customer sees all problems at once).
2. Take the stock of each product with one atomic update ("only if enough is left"). Two customers can never both buy the last item.
3. Create the order. If anything fails, the stock already taken is put back.

Status flow: `pending → confirmed → processing → shipped → delivered`. An order can be `cancelled` until it ships, and cancelling puts the stock back (only once, even if two cancel requests arrive together). A customer only sees their own orders, and someone else's order is a 404.

**Search and indexes.** `search` is a case-insensitive "contains" match on name, SKU and description. It is simple, but it cannot use an index, so use a MongoDB text index or Atlas Search for a large catalogue. Other lookups (category, price, order lists) are covered by indexes declared in the schemas.

**Other.** Helmet, CORS, request logging (morgan), a global rate limit and a stricter one for login/register. Behind a reverse proxy, set `app.set('trust proxy', 1)` so the rate limit sees the real client IP.

## Assumptions

- Payment, shipping fees, tax and discount codes are out of scope. `totalAmount` is the sum of item subtotals.
- Only customers place orders; admins manage them.
- Product `status` is `active` or `inactive`; only active products are shown to customers and can be ordered.
