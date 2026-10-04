import Link from "next/link";

export default function Layer2Page() {
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
        <Link href="/Layer1" style={{ color: "black", textDecoration: "none" }}>
          Layer 1
        </Link>
        <span style={{ fontWeight: "700", textDecoration: "underline", textUnderlineOffset: "6px" }}>
          Layer 2
        </span>
      </nav>

      <main style={{
        flex: 1,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px",
      }}>
        <div style={{
          width: "100%",
          maxWidth: "900px",
          minHeight: "70vh",
          background: "white",
          border: "2px solid black",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "18px",
          padding: "32px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}>
          <h1 style={{ marginTop: 0 }}>All Orgs Info</h1>
          {/* org content goes here */}
        </div>
      </main>
    </div>
  );
}