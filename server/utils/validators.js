const NAME_PATTERN = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function validateFullName(value) {
  const name = normalizeName(value);
  if (!name) {
    return 'Full name is required';
  }
  if (!NAME_PATTERN.test(name)) {
    return 'Full name may contain letters and spaces only';
  }
  if (name.length < 2 || name.length > 80) {
    return 'Full name must be between 2 and 80 characters';
  }
  return null;
}

function validateEmail(value) {
  const email = normalizeEmail(value);
  if (!email) {
    return 'Email is required';
  }
  if (!EMAIL_PATTERN.test(email) || email.length > 120) {
    return 'Enter a valid email address';
  }
  return null;
}

function validatePassword(value) {
  if (!value) {
    return 'Password is required';
  }
  if (String(value).length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (String(value).length > 72) {
    return 'Password must be 72 characters or fewer';
  }
  return null;
}

function validatePasswordConfirmation(password, confirmation) {
  if (password !== confirmation) {
    return 'Password confirmation does not match';
  }
  return null;
}

function validateLocation(value) {
  if (value == null || value === '') {
    return null;
  }
  if (String(value).trim().length > 100) {
    return 'Location must be 100 characters or fewer';
  }
  return null;
}

function validateBio(value) {
  if (value == null || value === '') {
    return null;
  }
  if (String(value).trim().length > 500) {
    return 'Bio must be 500 characters or fewer';
  }
  return null;
}

module.exports = {
  NAME_PATTERN,
  EMAIL_PATTERN,
  normalizeName,
  normalizeEmail,
  validateFullName,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validateLocation,
  validateBio,
};
