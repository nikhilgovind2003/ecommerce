// Boots the real Express app on a random port against a throwaway database.
// Uses MONGO_URI_TEST (never MONGO_URI) so a test run can't touch real data.
process.env.NODE_ENV = 'test';
require('dotenv').config({ quiet: true });
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const mongoose = require('mongoose');
const app = require('../../src/app');
const User = require('../../src/models/User');

const BASE_URI = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017';

exports.start = async (suiteName) => {
  // one database per test file, so files can't interfere with each other
  await mongoose.connect(BASE_URI, { dbName: `ecommerce_test_${suiteName}` });
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const api = async (method, path, { token, body } = {}) => {
    const res = await fetch(baseUrl + path, {
      method,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };

  const login = async (email, password) => (await api('POST', '/api/auth/login', { body: { email, password } })).body.data.token;

  const createAdmin = async (email = 'admin@test.com') => {
    await User.create({ name: 'Admin', email, password: 'admin123', role: 'admin' });
    return login(email, 'admin123');
  };

  const createCustomer = async (email) => {
    const res = await api('POST', '/api/auth/register', { body: { name: 'Customer', email, password: 'secret1' } });
    return { token: res.body.data.token, id: res.body.data.user._id };
  };

  const stop = async () => {
    await mongoose.connection.dropDatabase();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  };

  return { api, createAdmin, createCustomer, stop };
};
