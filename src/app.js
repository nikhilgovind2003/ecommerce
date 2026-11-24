// Builds the Express app: security middleware, then the routes of each module, then error handling.
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/user.routes.js';
import categoryRoutes from './modules/categories/category.routes.js';
import productRoutes from './modules/products/product.routes.js';
import orderRoutes from './modules/orders/order.routes.js';
import docsRoutes from './docs/docs.routes.js';
import { globalLimiter } from './shared/middleware/rateLimiters.js';
import { notFound, errorHandler } from './shared/middleware/errorHandler.js';

const app = express();

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}
// Swagger UI needs inline scripts, so it is mounted before helmet's strict CSP.
// Off in production unless ENABLE_DOCS=true.
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DOCS === 'true') {
  app.use(docsRoutes);
}
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/api', globalLimiter);

app.get('/', (req, res) => res.json({ message: 'API is running' }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
