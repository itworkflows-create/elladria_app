type SessionError = { name?: string; status?: number; code?: string; message?: string };

// Connection failures must not discard a candidate's last synchronized data.
export function customerAuthError(error: SessionError | null, hasUser: boolean): Error | null {
  if (error) {
    if (error.name === 'AuthSessionMissingError' || error.status === 401 ||
        ['session_not_found', 'refresh_token_not_found', 'refresh_token_already_used', 'user_not_found'].includes(error.code ?? '')) {
      return Object.assign(new Error('Sign in to continue.'), { status: 401 });
    }
    return new Error('Unable to sync your account. Check your connection and try again.');
  }
  return hasUser ? null : Object.assign(new Error('Sign in to continue.'), { status: 401 });
}
