import { ImageResponse } from "next/og";

export const alt = "Eventloom event websites with online RSVPs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          color: "#fff9f2",
          background: "linear-gradient(135deg, #302821 0%, #4a2d2a 58%, #8a6153 100%)",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px", fontSize: "30px", fontWeight: 700 }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "#f3d7bd", display: "flex" }} />
          Eventloom
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: "930px" }}>
          <div style={{ fontSize: "68px", lineHeight: 1.03, fontWeight: 700, letterSpacing: "-2px" }}>Create a beautiful event website with RSVPs</div>
          <div style={{ marginTop: "28px", fontSize: "28px", lineHeight: 1.35, color: "#f7e7da" }}>Share one simple link. Keep every guest response organized.</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "20px", color: "#f3d7bd" }}>
          <span>Wedding · Birthday · Private events</span>
          <span>eventloom.co</span>
        </div>
      </div>
    ),
    size,
  );
}
