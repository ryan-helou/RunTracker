"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          background: "#0a0a0e",
          color: "#edecf2",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
        }}
      >
        <div style={{ textAlign: "center", padding: "0 1.5rem" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Something broke</h1>
          <p style={{ color: "#8d8d9c", fontSize: "0.9rem", marginTop: "0.5rem" }}>
            The app hit an unexpected error.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.25rem",
              background: "#ffb224",
              color: "#0a0a0e",
              fontWeight: 600,
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.5rem 1.25rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
