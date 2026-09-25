import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { login } from "../api/authService.js";
import { getAuthenticatedUser } from "../auth/authSession.js";
import { getPostLoginDestination } from "../auth/authRouting.js";
import shoperaLogo from "../assets/branding/shoperalogo.png";
import "../styles/login.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const current = getAuthenticatedUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (current?.role === "ADMIN") return <Navigate to="/admin" replace />;

  const submit = async (event) => {
    event.preventDefault();
    if (loading) return;
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const session = await login({ email: email.trim(), password });
      setPassword("");
      const destination = getPostLoginDestination(session);
      if (!destination) {
        setError("This login is not authorized for the Admin workspace.");
        return;
      }
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="shopera-login-page">
      <form className="shopera-login-card" onSubmit={submit} noValidate>
        <div className="shopera-login-logo-panel">
          <img src={shoperaLogo} alt="Shopera" />
        </div>
        <div><h1>Admin sign in</h1><p>Use your Shopera administrator account.</p></div>
        {error && <p className="shopera-login-error" role="alert">{error}</p>}
        <label>Email<input type="email" autoComplete="username" value={email}
          onChange={(event) => setEmail(event.target.value)} disabled={loading} /></label>
        <label>Password<input type="password" autoComplete="current-password" value={password}
          onChange={(event) => setPassword(event.target.value)} disabled={loading} /></label>
        <button type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  );
}
