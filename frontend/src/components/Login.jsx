// frontend/src/components/Login.jsx

import { useState } from "react";
import { loginUser } from "../utils/authApi";

function Login({ onLogin, onSwitchToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const result = await loginUser(
        email.trim(),
        password
      );

      onLogin(result.user);
    } catch (err) {
      setError(
        err.message || "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-logo">AI</div>

          <div>
            <div className="auth-brand-name">
              Career.OS
            </div>

            <div className="auth-brand-subtitle">
              AI Career Assistant
            </div>
          </div>
        </div>

        {/* Heading */}
        <div className="auth-heading">
          <h1>Welcome back</h1>

          <p>
            Sign in to continue your career journey.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        {/* Form */}
        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <div className="auth-field">
            <label htmlFor="login-email">
              Email
            </label>

            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">
              Password
            </label>

            <input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Sign in"}
          </button>
        </form>

        {/* Switch */}
        <div className="auth-switch">
          <span>Don't have an account?</span>

          <button
            type="button"
            onClick={onSwitchToRegister}
          >
            Create account
          </button>
        </div>

      </div>
    </div>
  );
}

export default Login;