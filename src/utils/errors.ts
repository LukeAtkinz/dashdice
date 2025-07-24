/**
 * Firebase error codes and their user-friendly messages
 */
export const firebaseErrorMessages: Record<string, string> = {
  'auth/user-not-found': 'No account found with this email address.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/invalid-email': 'Invalid email address.',
  'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Please check your connection.',
  'auth/requires-recent-login': 'Please sign in again to complete this action.',
  'permission-denied': 'You do not have permission to perform this action.',
  'not-found': 'The requested resource was not found.',
  'already-exists': 'The resource already exists.',
  'failed-precondition': 'Operation failed due to a failed precondition.',
  'aborted': 'Operation was aborted.',
  'out-of-range': 'Operation was attempted outside the valid range.',
  'unauthenticated': 'You must be signed in to perform this action.',
  'resource-exhausted': 'Resource limit exceeded. Please try again later.',
  'data-loss': 'Data loss occurred during the operation.',
  'unknown': 'An unknown error occurred.',
  'internal': 'Internal server error. Please try again later.',
  'unavailable': 'Service is currently unavailable. Please try again later.',
  'deadline-exceeded': 'Operation timed out. Please try again.',
};

/**
 * Get a user-friendly error message from a Firebase error
 */
export const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }

  if (error?.code && firebaseErrorMessages[error.code]) {
    return firebaseErrorMessages[error.code];
  }

  if (error?.message) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
};

/**
 * Log errors in development and production appropriately
 */
export const logError = (error: any, context?: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(`Error${context ? ` in ${context}` : ''}:`, error);
  } else {
    // In production, you might want to send errors to a service like Sentry
    console.error('An error occurred:', getErrorMessage(error));
  }
};
