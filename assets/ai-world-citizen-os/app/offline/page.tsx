export default function OfflinePage() {
  return (
    <main
      style={{
        alignItems: "center",
        background: "#f8f5ef",
        boxSizing: "border-box",
        color: "#1c1c1c",
        display: "flex",
        justifyContent: "center",
        margin: 0,
        minHeight: "100dvh",
        padding: "24px",
      }}
    >
      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e9dfd2",
          borderRadius: "24px",
          boxShadow: "0 18px 44px rgba(83, 58, 36, 0.08)",
          maxWidth: "430px",
          padding: "32px 24px",
          textAlign: "center",
          width: "100%",
        }}
      >
        <div style={{ color: "#e88a4a", fontSize: "12px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Travel OS
        </div>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "34px", lineHeight: 1.1, margin: "18px 0 0" }}>当前处于离线状态</h1>
        <p style={{ color: "#7a746c", fontSize: "15px", lineHeight: 1.7, margin: "18px 0 0" }}>
          你仍然可以在网络恢复后继续同步旅程数据。
        </p>
        <a
          href="/"
          style={{
            background: "#e88a4a",
            borderRadius: "12px",
            color: "#ffffff",
            display: "block",
            fontSize: "15px",
            fontWeight: 600,
            marginTop: "28px",
            padding: "14px 18px",
            textDecoration: "none",
          }}
        >
          重新尝试
        </a>
      </section>
    </main>
  );
}
