import Link from "next/link";

export default function Layer3Page() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      gap: "16px",
      fontFamily: "Roboto, sans-serif",
      background: "linear-gradient(135deg, #93E9BE, #FBFBF9)",
      position: "relative",
    }}>
      <h1 style={{ fontSize: "48px", margin: 0 }}>This is L3</h1>

      <a
        href="https://example.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontSize: "22px", color: "black" }}
      >
        insert url here
      </a>

      <Link href="/Layer1" style={{
        ...pillStyle,
        position: "absolute",
        bottom: "30px",
        right: "30px",
      }}>
        Back to Layer 1
      </Link>
    </div>
  );
}

const pillStyle = {
  display: "inline-block",
  padding: "14px 32px",
  background: "#93E9BE",
  color: "black",
  border: "2px solid black",
  borderRadius: "999px",
  textDecoration: "none",
  minWidth: "220px",
  textAlign: "center" as const,
};