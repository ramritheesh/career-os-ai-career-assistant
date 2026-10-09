// frontend/src/utils/auth.js

const TOKEN_KEY = "career_assistant_token";
const USER_KEY = "career_assistant_user";

// =====================================================
// TOKEN
// =====================================================

export function saveToken(token) {
  localStorage.setItem(
    TOKEN_KEY,
    token
  );
}

export function getToken() {
  return localStorage.getItem(
    TOKEN_KEY
  );
}

export function removeToken() {
  localStorage.removeItem(
    TOKEN_KEY
  );
}

// =====================================================
// USER
// =====================================================

export function saveUser(user) {
  localStorage.setItem(
    USER_KEY,
    JSON.stringify(user)
  );
}

export function getUser() {
  const user =
    localStorage.getItem(
      USER_KEY
    );

  if (!user) {
    return null;
  }

  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
}

export function removeUser() {
  localStorage.removeItem(
    USER_KEY
  );
}

// =====================================================
// AUTH
// =====================================================

export function isAuthenticated() {
  return Boolean(
    getToken()
  );
}

export function logout() {
  removeToken();
  removeUser();
}

// =====================================================
// AUTHENTICATED FETCH
// =====================================================

export async function authFetch(
  url,
  options = {}
) {
  const token =
    getToken();

  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  // Don't manually set Content-Type
  // when sending FormData.
  if (
    !(options.body instanceof FormData) &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] =
      "application/json";
  }

  const response =
    await fetch(
      url,
      {
        ...options,
        headers,
      }
    );

  // Automatically logout when JWT expires
  if (
    response.status === 401
  ) {
    logout();
  }

  return response;
}