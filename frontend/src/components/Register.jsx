// frontend/src/components/Register.jsx

import { useState } from "react";
import { registerUser } from "../utils/authApi";

function Register({ onRegister, onSwitchToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (
      !name.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters long."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const result = await registerUser(
        name.trim(),
        email.trim(),
        password
      );

      onRegister(result.user);
    } catch (err) {
      setError(
        err.message ||
          "Registration failed. Please try again."
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
          <h1>Create your account</h1>

          <p>
            Start building your AI-powered career profile.
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
            <label htmlFor="register-name">
              Full name
            </label>

            <input
              id="register-name"
              type="text"
              placeholder="Ram Ritheesh"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              autoComplete="name"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="register-email">
              Email
            </label>

            <input
              id="register-email"
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
            <label htmlFor="register-password">
              Password
            </label>

            <input
              id="register-password"
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              autoComplete="new-password"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="register-confirm-password">
              Confirm password
            </label>

            <input
              id="register-confirm-password"
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "Creating account..."
              : "Create account"}
          </button>
        </form>

        {/* Switch */}
        <div className="auth-switch">
          <span>Already have an account?</span>

          <button
            type="button"
            onClick={onSwitchToLogin}
          >
            Sign in
          </button>
        </div>

      </div>
    </div>
  );
}

export default Register;