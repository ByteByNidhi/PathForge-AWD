const CareerPathRequest = require('../models/CareerPathRequest');
const AppError = require('../utils/AppError');

function serializeRequest(request) {
  const user = request.user;
  return {
    id: String(request._id),
    requestedPath: request.requestedPath,
    status: request.status,
    createdAt: request.createdAt,
    user: user
      ? {
          id: String(user._id),
          name: user.name,
          email: user.email,
        }
      : null,
  };
}

async function list() {
  const requests = await CareerPathRequest.find()
    .populate('user', 'name email')
    .sort({ createdAt: -1 });

  const grouped = new Map();
  for (const request of requests) {
    const key = request.requestedPath;
    if (!grouped.has(key)) {
      grouped.set(key, {
        requestedPath: key,
        requestCount: 0,
        pendingCount: 0,
        latestAt: request.createdAt,
      });
    }
    const group = grouped.get(key);
    group.requestCount += 1;
    if (request.status === 'pending') {
      group.pendingCount += 1;
    }
    if (request.createdAt > group.latestAt) {
      group.latestAt = request.createdAt;
    }
  }

  const groups = [...grouped.values()].sort((left, right) => {
    if (right.requestCount !== left.requestCount) {
      return right.requestCount - left.requestCount;
    }
    return String(left.requestedPath).localeCompare(String(right.requestedPath));
  });

  return {
    groups,
    requests: requests.map(serializeRequest),
  };
}

async function markReviewed(body) {
  const requestedPath = String(body.requestedPath || body.requested_path || '').trim();
  if (!requestedPath) {
    throw new AppError('Requested path is required', 400, [
      { field: 'requestedPath', message: 'Requested path is required' },
    ]);
  }
  if (requestedPath.length > 120) {
    throw new AppError('Requested path must be 120 characters or fewer', 400, [
      { field: 'requestedPath', message: 'Requested path must be 120 characters or fewer' },
    ]);
  }

  const result = await CareerPathRequest.updateMany(
    { requestedPath, status: 'pending' },
    { $set: { status: 'reviewed' } }
  );

  return {
    requestedPath,
    updated: result.modifiedCount || 0,
  };
}

module.exports = {
  list,
  markReviewed,
};
