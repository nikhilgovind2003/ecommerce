// Product schema. `effectivePrice` is the sale price if there is one, otherwise the normal price.
// The service keeps it in sync and checks that salePrice is not above price.
import mongoose from 'mongoose';

export const PRODUCT_STATUSES = ['active', 'inactive'];

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    price: { type: Number, required: true, min: 0 },
    salePrice: {
      type: Number,
      min: 0,
      default: null,
    },
    // What the customer actually pays. Stored (not virtual) so price filters and sorting can use an index.
    effecAs part of our technical evaluation process for the Mid-Level Node.js Developer position, please complete the following machine test.
Machine Test – E-commerce REST API
Develop a backend REST API for a basic E-commerce Application using Node.js, Express.js, MongoDB/Mongoose, and JWT authentication.
The application should include the following modules:
1. User Management
User registration and login
JWT-based authentication
Roles: Admin and Customer
User profile
Admin should be able to view and activate/deactivate users
2. Multi-Level Category Management
Admin should be able to create, update, list, and delete categories.
Categories must support multiple nested levels without a fixed depth.
Example:
Electronics
├── Mobiles
│   ├── Android Phones
│   │   ├── Samsung
│   │   └── OnePlus
│   └── iPhones
└── Computers
    ├── Laptops
    └── Desktops
Each category can have a parent category and multiple child categories.
Provide an API to return the complete category hierarchy/tree.
Prevent invalid or circular parent-child relationships.
3. Product Management
Admin can create, update, delete, and list products.
Products should contain fields such as name, SKU, description, price, sale price, stock, category, and status.
Each product should belong to a category.
Customer product listing should support:
Search
Category filtering
Price filtering
Sorting
Pagination
When filtering by a parent category, products belonging to all its child/subcategories should also be returned.
4. Order Management
Authenticated customers can place orders.
An order can contain multiple products and quantities.
Validate product availability and stock before creating an order.
Product prices and order totals must be calculated on the backend.
Reduce stock after successful order creation.
Customers should only be able to view their own orders.
Admin should be able to view all orders and update order status.
Suggested order statuses:
Pending → Confirmed → Processing → Shipped → Delivered / Cancelled
5. General Requirements
Proper project structure and separation of concerns
Request validation
Centralized error handling
Appropriate HTTP status codes
Role-based authorization
Secure password hashing
Environment variables for sensitive configuration
Clean and maintainable code
Submission
Please submit:
Complete source code via Git repository
README with setup and run instructions
.env.example
Postman collection or Swagger/OpenAPI documentation
Bonus: Unit/integration tests, Docker setup, rate limiting, request logging, MongoDB transactions/atomic stock handling, and proper database indexing.
The main areas of evaluation will be API design, multi-level category implementation, database modelling, authentication/authorization, order and stock handling, error handling, code structure, and overall code quality.
tivePrice: { type: Number, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0, validate: Number.isInteger },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    status: { type: String, enum: PRODUCT_STATUSES, default: 'active' },
  },
  { timestamps: true, versionKey: false }
);

productSchema.index({ category: 1, status: 1 });
productSchema.index({ status: 1, effectivePrice: 1 });
productSchema.index({ createdAt: -1 });

export default mongoose.model('Product', productSchema);
