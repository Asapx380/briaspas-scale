import { ImageResponse } from "next/og";

export const alt = "Briaspas Scale, prospecção com sites-demo e CRM";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#e6e7ec", color: "#1d1d1f", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", width: 1040, flexDirection: "column", gap: 30, padding: 64, borderRadius: 42, background: "white", boxShadow: "0 28px 80px rgba(15,23,42,0.12)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, color: "#0071e3", fontSize: 28, fontWeight: 700 }}><div style={{ width: 34, height: 34, borderRadius: 10, background: "#0071e3" }} />Briaspas Scale</div>
        <div style={{ display: "flex", maxWidth: 860, fontSize: 68, lineHeight: 1.05, fontWeight: 750, letterSpacing: "-3px" }}>Chegue ao lead com uma proposta concreta.</div>
        <div style={{ display: "flex", fontSize: 28, color: "#636366" }}>Prospecção, sites-demo e CRM em um só fluxo.</div>
      </div>
    </div>,
    size,
  );
}
