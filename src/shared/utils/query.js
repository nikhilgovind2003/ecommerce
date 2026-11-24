// Small helpers used by the list endpoints (pagination and text search).

// ?page=2&limit=20  ->  { page: 2, limit: 20, skip: 20 }. Bad values fall back to safe defaults.
export const parsePagination = (query, { defaultLimit = 10, maxLimit = 100 } = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const wantedLimit = parseInt(query.limit, 10) || defaultLimit;
  const limit = Math.min(Math.max(wantedLimit, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
};

// The "pagination" block that is sent back with every list response.
export const buildPagination = ({ page, limit }, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit) || 1,
});

// Makes user text safe to put inside a RegExp, so "a.b" searches for "a.b" and not "a any-char b".
export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Case-insensitive "contains" regex for search boxes.
export const searchRegex = (text) => new RegExp(escapeRegex(String(text)), 'i');
