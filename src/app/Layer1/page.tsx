import Link from "next/link";

export default function Layer1Page() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      fontFamily: "Roboto, sans-serif",
      background: "linear-gradient(135deg, #93E9BE, #FBFBF9)",
    }}>
      <nav style={{
        width: "180px",
        borderRight: "2px solid black",
        background: "white",
        padding: "40px 20px",
        fontSize: "25px",
        justifyContent: "center",
        alignItems: "center",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}>
        <span style={{ fontWeight: "700", textDecoration: "underline", textUnderlineOffset: "6px" }}>
          Layer 1
        </span>
        <Link href="/Layer2" style={{ color: "black", textDecoration: "none" }}>
          Layer 2
        </Link>
      </nav>

      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: "20px",
        position: "relative",
      }}>
        <Link href="/Layer3" style={pillStyle}>Go to Layer 3</Link>
        <Link href="/users/login" style={pillStyle}>Go to NOBE DevOps</Link>
        <Link href="/PortalLoginPage" style={{...pillStyle, position: "absolute", bottom: "30px", right: "30px",}}>Back to Login</Link>
      </main>
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