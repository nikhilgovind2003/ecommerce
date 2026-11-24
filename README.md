# E-commerce REST API

A backend REST API for a basic e-commerce application, built with **Node.js, Express 5, MongoDB/Mongoose and JWT**.

- **Users:** registration, login, profile, roles (`admin` / `customer`), admin can activate/deactivate users
- **Categories:** unlimited nesting, full tree endpoint, protection against circular parent/child relations
- **Products:** admin CRUD, customer listing with search, category / price filters, sorting and pagination
- **Orders:** server-side pricing, stock validation and atomic stock reduction, status workflow, per-customer privacy

## Quick start

Requirements: Node.js 20+ and a running MongoDB (local or Atlas).

```bash
npm install
cp .env.example .env        # then edit MONGO_URI, JWT_SECRET and the ADMIN_* values
npm run seed:admin          # creates the first admin account from ADMIN_* in .env
npm run dev                 # development (nodemon)   |   npm start  for plain node
```

The API runs on `http://localhost:3000` (or `PORT`). Public registration only ever creates **customers**, so the admin has to be created with the seed script.

### Environment variables

See [.env.example](.env.example). The important ones:

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Token signing secret (required, the server refuses to start without it) and lifetime |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Used by `npm run seed:admin` |
| `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MINUTES` | Global and login/register rate limits |
| `USE_TRANSACTIONS` | `true` / `false` to force MongoDB transactions for orders; empty = auto-detect |
| `MONGO_URI_TEST` | MongoDB server used by `npm test` (tests create and drop their own databases) |

## Documentation

- **Postman:** [docs/postman_collection.json](docs/postman_collection.json). Import it, set `adminEmail` / `adminPassword`, and run the folders top to bottom on a fresh database. Tokens and ids are stored in collection variables by test scripts, so no copy-pasting is needed.

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

Successful responses look like `{ "status": "success", "data": ..., "pagination": ... }`. Errors always look like `{ "status": "error", "message": "...", "errors": [{ "field": "...", "message": "..." }] }` with an appropriate status code (400, 401, 403, 404, 409, 429, 500).

`sort` values: `newest` (default), `oldest`, `price_asc`, `price_desc`, `name_asc`, `name_desc`.

## Project structure

```
server.js                 entry point: env check, DB connection, listen
scripts/seedAdmin.js      creates the first admin
src/
  app.js                  middleware stack and route mounting
  config/db.js            Mongo connection
  models/                 User, Category, Product, Order (schemas + indexes)
  routes/                 URL -> middleware chain -> controller
  validators/             express-validator rules per resource
  controllers/            thin HTTP layer (read request, call service, send response)
  services/               business rules (categories, products, orders, users)
  middleware/             auth, authorize, validate, rate limiters, error handler
  utils/                  AppError, asyncHandler, pagination, categoryTree, orderCalc, orderStatus, transactions
tests/
  unit/                   pure logic
  integration/            full API against a throwaway database
docs/                     Postman collection
```

## Design decisions

**Multi-level categories.** Each category stores its `parent` and an `ancestors` array (ids from the root down to the parent).
- Depth is unlimited and the whole tree is built in memory from a single query (`utils/categoryTree.js`), with no recursive database calls.
- All descendants of a category are found with one indexed query (`{ ancestors: id }`). That is what makes "filter by a parent category and include sub-categories" cheap.
- A category cannot become its own parent or move under one of its descendants (checked through `ancestors`). Moving a category re-bases the `ancestors` of its whole subtree.
- Sibling names are unique (`{ parent, name }` unique index); the same name is fine under different parents. A category with children or products cannot be deleted.

**Orders and stock.**
- The client sends only product ids and quantities. Name, SKU, price (sale price when set) and totals come from the database. Order items store a snapshot, so later price changes or deleted products never rewrite history. Money is added up in cents to avoid floating point errors.
- Stock is reduced with a conditional atomic update (`stock >= qty` in the filter, `$inc` in the update), so two customers can never both buy the last unit.
- When MongoDB runs as a replica set the whole order (all stock updates plus the order document) runs inside a **transaction**. On a standalone MongoDB (no transactions available) the same atomic updates are used and anything already reserved is put back if a later step fails. This is auto-detected, or forced with `USE_TRANSACTIONS`.
- Status workflow: `pending → confirmed → processing → shipped → delivered`, with `cancelled` allowed until the order ships. Delivered and cancelled are final. Cancelling returns the stock, and a compare-and-set on the status prevents it from being returned twice if two cancel requests arrive together.
- Customers can only read orders where `user` is themselves; someone else's order is a 404, not a 403, so ids can't be probed.

**Auth.**
- Passwords are hashed with bcrypt, JWTs are signed with `JWT_SECRET`, and the role is never accepted from the request body.
- The user is loaded from the database on every request, so deactivating an account takes effect immediately even for tokens that haven't expired.

**Search.** `search` is a case-insensitive, regex-escaped substring match on name, SKU and description. It is simple and handles partial words, but it cannot use an index. For a large catalogue, switch to a MongoDB text index or Atlas Search.

**Indexes** are declared in the schemas (unique email / SKU / sibling names, `ancestors`, product `category + status`, `status + effectivePrice`, order `user + createdAt` and `status + createdAt`). Mongoose builds them on startup; in production prefer running `Model.syncIndexes()` from a deploy step and turning `autoIndex` off.

**Other.** Helmet, CORS, request logging (morgan), a global rate limit and a stricter one on login/register. If you run behind a reverse proxy, set `app.set('trust proxy', 1)` so rate limits use the real client IP.

## Tests

```bash
npm test                  # everything (needs MongoDB)
npm run test:unit         # no database needed
npm run test:integration
```

Integration tests start the real app on a random port and use `MONGO_URI_TEST` (default `mongodb://127.0.0.1:27017`), creating and dropping one database per test file. They never touch `MONGO_URI`. They cover auth and roles, category rules including circular moves, product search/filter/sort/pagination, and the order flow including concurrent orders for the last unit and cancelling twice at once.

To exercise the transaction code path locally, run MongoDB as a single-node replica set, e.g. `mongod --replSet rs0` followed by `rs.initiate()` in `mongosh`, and use `?replicaSet=rs0` in the connection string.

## Assumptions

- Payment, shipping fees, tax and discount codes are out of scope. `totalAmount` is the sum of item subtotals.
- Only customers place orders; admins manage them.
- Product `status` is `active` or `inactive`; only active products are shown to customers and can be ordered.
