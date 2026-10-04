import Link from "next/link";

export default function PortalLoginPage() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "Roboto",
      background: "linear-gradient(135deg, #93E9BE, #FBFBF9)"
    }}>
      <div style={{
        border: "2px solid black",
        borderRadius: "18px",
        padding: "20px",
        width: "200px",
        textAlign: "center",
        background: "white",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      }}>
        <h1 style={{ marginBottom: "24px" }}>Log in</h1>
        <Link href="/Layer1" style={{
          display: "inline-block",
          padding: "10px 20px",
          background: "#93E9BE",
          color: "black",
          borderRadius: "8px",
          textDecoration: "none",
        }}>
          Go to Layer 1
        </Link>
      </div>
    </div>
  );
}