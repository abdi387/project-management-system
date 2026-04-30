// src/utils/validation.js

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  if (!email.endsWith('@hu.edu.et')) {
    return { valid: false, error: 'Must use Hawassa University email (@hu.edu.et)' };
  }
  return { valid: true };
};

export const validatePassword = (password) => {
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' };
  }
  return { valid: true };
};

export const validateStudentId = (studentId) => {
  if (!studentId) {
    return { valid: false, error: 'Student ID is required' };
  }
  // Format: XXXX/XX (example: 1234/14)
  const idRegex = /^\d{4}\/\d{2}$/;
  if (!idRegex.test(studentId)) {
    return { valid: false, error: 'Invalid Student ID format (e.g., 1234/14)' };
  }
  return { valid: true };
};

export const validateCGPA = (cgpa) => {
  const numCgpa = parseFloat(cgpa);
  if (!cgpa) {
    return { valid: false, error: 'CGPA is required' };
  }
  if (isNaN(numCgpa)) {
    return { valid: false, error: 'CGPA must be a number' };
  }
  if (numCgpa < 2.0 || numCgpa > 4.0) {
    return { valid: false, error: 'CGPA must be between 2.0 and 4.0' };
  }
  return { valid: true };
};

export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return { valid: false, error: `${fieldName} is required` };
  }
  return { valid: true };
};