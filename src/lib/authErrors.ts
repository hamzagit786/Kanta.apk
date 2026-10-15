/**
 * Map Firebase authentication errors to user-friendly messages.
 * Never exposes raw error codes or Firebase internal messages.
 */
export function mapAuthError(error: unknown): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const code = (error as { code?: string })?.code || '';
  const message = error instanceof Error ? error.message : String(error);

  // Invalid email or password / bad credentials
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found' ||
    code === 'auth/invalid-login-credentials' ||
    message.includes('auth/invalid-credential') ||
    message.includes('auth/wrong-password') ||
    message.includes('auth/user-not-found') ||
    message.includes('invalid-credential')
  ) {
    return 'Invalid email or password. Please check your details and try again.';
  }

  // Invalid email format
  if (code === 'auth/invalid-email' || message.includes('auth/invalid-email')) {
    return 'Please enter a valid email address.';
  }

  // Account disabled
  if (code === 'auth/user-disabled' || message.includes('auth/user-disabled')) {
    return 'This account has been disabled. Please contact support.';
  }

  // Rate limiting / too many failed attempts
  if (code === 'auth/too-many-requests' || message.includes('auth/too-many-requests')) {
    return 'Too many failed login attempts. Please wait a few minutes before trying again, or reset your password.';
  }

  // Network connection failures
  if (
    code === 'auth/network-request-failed' ||
    message.includes('network-request-failed') ||
    message.includes('offline')
  ) {
    return 'Network error. Please check your internet connection and try again.';
  }

  // Email already registered
  if (code === 'auth/email-already-in-use' || message.includes('auth/email-already-in-use')) {
    return 'An account with this email address already exists. Please sign in instead.';
  }

  // Weak password
  if (code === 'auth/weak-password' || message.includes('auth/weak-password')) {
    return 'Password must be at least 6 characters.';
  }

  // Google sign in popup closed or cancelled
  if (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request' ||
    message.includes('popup-closed-by-user')
  ) {
    return 'Sign in was cancelled. Please select your Google account to proceed.';
  }

  // Browser blocked popup
  if (code === 'auth/popup-blocked' || message.includes('popup-blocked')) {
    return 'Sign-in popup was blocked by your browser. Please allow popups for this site and try again.';
  }

  // Default fallback is simple, safe, and helpful without exposing internal details
  return 'Invalid email or password. Please check your details and try again.';
}
