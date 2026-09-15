const mongoose = require('mongoose');

function isValidId(value) {
  return Boolean(value) && mongoose.Types.ObjectId.isValid(String(idOf(value) || value));
}

function idOf(value) {
  if (value == null) {
    return '';
  }
  if (typeof value === 'object') {
    if (value._id != null) {
      return String(value._id);
    }
    if (value.id != null && typeof value.id !== 'function') {
      return String(value.id);
    }
  }
  return String(value);
}

function idsEqual(left, right) {
  if (left == null || right == null) {
    return false;
  }
  return idOf(left) === idOf(right);
}

module.exports = {
  isValidId,
  idOf,
  idsEqual,
};
