const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Attaches req.user when a valid token is present, but never rejects the request.
module.exports = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    if (header.startsWith('Bearer ')) {
      const { id } = jwt.verify(header.slice(7), process.env.JWT_SECRET);
      const user = await User.findById(id);
      if (user?.isActive) req.user = user;
    }
  } catch {
    // ignore: treated as an anonymous request
  }
  next();
};
