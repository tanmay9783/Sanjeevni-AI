import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Clinical UI Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "#0F172A",
          color: "#F8FAFC",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          zIndex: 9999
        }}>
          <div style={{
            background: "rgba(30, 41, 59, 0.9)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "20px",
            padding: "32px",
            maxWidth: "480px",
            textAlign: "center",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)"
          }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>🩺</div>
            <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px", color: "#F8FAFC" }}>
              Sanjeevni AI Kiosk Reloading
            </h2>
            <p style={{ fontSize: "14px", color: "#94A3B8", marginBottom: "20px", lineHeight: "1.5" }}>
              The 3D virtual environment encountered a graphics refresh. Click below to reconnect to the session.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              style={{
                background: "linear-gradient(135deg, #0EA5E9, #0284C7)",
                color: "#FFFFFF",
                fontWeight: "700",
                fontSize: "14px",
                padding: "12px 24px",
                borderRadius: "12px",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(14, 165, 233, 0.4)"
              }}
            >
              Restart Consultation →
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
