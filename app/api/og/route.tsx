import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#1C1712",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "36px",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
          <p
            style={{
              color: "#78716C",
              fontSize: "13px",
              letterSpacing: "0.45em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            Café
          </p>
          <h1
            style={{
              color: "#E8E0D8",
              fontSize: "80px",
              fontWeight: 300,
              letterSpacing: "0.04em",
              margin: 0,
              lineHeight: 1,
            }}
          >
            La Commune
          </h1>
        </div>

        {/* Tarjeta visual con sellos */}
        <div
          style={{
            display: "flex",
            gap: "18px",
            alignItems: "center",
            padding: "24px 36px",
            borderRadius: "20px",
            border: "1px solid #3D3632",
            background: "#231F1B",
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                border: `2px solid ${i < 3 ? "#8A6A3A" : "#3D3632"}`,
                background: i < 3 ? "rgba(138,106,58,0.15)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "30px",
              }}
            >
              {i < 3 ? "☕" : ""}
            </div>
          ))}
        </div>

        {/* Nombre o tagline */}
        <p
          style={{
            color: "#78716C",
            fontSize: "18px",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          {name ? `Tarjeta de ${name}` : "Tarjeta de fidelidad"}
        </p>

        {/* Ubicación */}
        <p
          style={{
            color: "#3D3632",
            fontSize: "13px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          Mineral de la Reforma · Hidalgo
        </p>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
