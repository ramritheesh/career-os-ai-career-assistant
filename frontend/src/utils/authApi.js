// frontend/src/utils/authApi.js

import {
  saveToken,
  saveUser,
  logout,
} from "./auth";

const API_URL =
  "http://localhost:5000";

// =====================================================
// REGISTER
// =====================================================

export async function registerUser(
  name,
  email,
  password
) {
  const response =
    await fetch(
      `${API_URL}/api/auth/register`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          name,
          email,
          password,
        }),
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Registration failed."
    );
  }

  saveToken(
    data.token
  );

  saveUser(
    data.user
  );

  return data;
}

// =====================================================
// LOGIN
// =====================================================

export async function loginUser(
  email,
  password
) {
  const response =
    await fetch(
      `${API_URL}/api/auth/login`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Login failed."
    );
  }

  saveToken(
    data.token
  );

  saveUser(
    data.user
  );

  return data;
}

// =====================================================
// CURRENT USER
// =====================================================

export async function getCurrentUser() {
  const {
    getToken,
  } = await import(
    "./auth"
  );

  const token =
    getToken();

  if (!token) {
    return null;
  }

  const response =
    await fetch(
      `${API_URL}/api/auth/me`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    logout();
    return null;
  }

  saveUser(
    data.user
  );

  return data.user;
}

// =====================================================
// LOGOUT
// =====================================================

export function logoutUser() {
  logout();
}