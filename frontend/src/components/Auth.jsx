import React, { useState, useEffect } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:4001";

export default function Auth({ onLogin, initialMode = "login", onClose }) {
  const [mode, setMode] = useState(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  async function submit(e) {
    e && e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await axios.post(API + "/api/auth/login", {
          username,
          password,
        });
        const { token, user } = res.data;
        onLogin(token, user);
        if (onClose) onClose();
      } else {
        await axios.post(API + "/api/auth/register", { username, password });
        setMode("login");
        alert("Registered — please login");
      }
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <form
        onSubmit={submit}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}
      >
        <input
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ padding: "8px", width: "100%", maxWidth: "300px" }}
        />
        <input
          placeholder="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: "8px", width: "100%", maxWidth: "300px" }}
        />
        <button className="btn" disabled={loading} type="submit">
          {mode === "login" ? "Login" : "Register"}
        </button>
      </form>
      <button
        style={{
          background: "transparent",
          border: "none",
          color: "#2563eb",
          cursor: "pointer",
        }}
        onClick={() => setMode(mode === "login" ? "register" : "login")}
      >
        {mode === "login" ? "Create account" : "Have an account?"}
      </button>
    </div>
  );
}
