// Parent class for all controllers.
// It only holds the response helpers, so every endpoint answers in the same shape.
export default class BaseController {
  // 200 { status: 'success', data, pagination? }
  ok(res, data, pagination) {
    const body = { status: 'success', data };
    if (pagination) body.pagination = pagination;
    res.json(body);
  }

  // 201 { status: 'success', data }
  created(res, data) {
    res.status(201).json({ status: 'success', data });
  }

  // 204, no body (used after delete)
  noContent(res) {
    res.status(204).end();
  }
}
