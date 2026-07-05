// ── Auth helpers: JWT token management ──────────────────────────────────────

const TOKEN_KEY = 'alphalens_token';
const USER_KEY  = 'alphalens_user';

export const setAuth = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
};

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const isAuthenticated = () => {
  const token = getToken();
  if (!token) return false;
  try {
    // Decode the JWT payload (no verification — just check expiry)
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};
