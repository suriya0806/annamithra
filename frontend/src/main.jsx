import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#072518",
          color: "#fbf9f4",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          padding: "24px"
        }}>
          <div style={{
            background: "#0b2216",
            border: "1px solid rgba(201, 152, 36, 0.35)",
            borderRadius: "12px",
            padding: "32px",
            maxWidth: "600px",
            width: "100%",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.6)"
          }}>
            <h2 style={{ color: "#ef4444", margin: "0 0 12px", fontSize: "20px" }}>
              ⚠️ Application Interface Error
            </h2>
            <p style={{ color: "#d0e4d9", fontSize: "14px", lineHeight: "1.5", margin: "0 0 16px" }}>
              An unexpected error occurred during rendering. You can reload the page or return to the main dashboard.
            </p>
            {this.state.error && (
              <pre style={{
                background: "#04150e",
                color: "#fca5a5",
                padding: "12px",
                borderRadius: "6px",
                fontSize: "12px",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                marginBottom: "20px",
                border: "1px solid rgba(239, 68, 68, 0.25)"
              }}>
                {this.state.error.toString()}
              </pre>
            )}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: "linear-gradient(135deg, #c99824 0%, #b8861b 100%)",
                  color: "#072518",
                  border: "1px solid #dfb743",
                  padding: "10px 18px",
                  borderRadius: "6px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Reload Page
              </button>
              <button
                onClick={() => {
                  window.location.href = "/";
                }}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "#fbf9f4",
                  border: "1px solid rgba(201, 152, 36, 0.3)",
                  padding: "10px 18px",
                  borderRadius: "6px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
