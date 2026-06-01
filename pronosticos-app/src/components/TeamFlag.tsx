"use client";

import Image from "next/image";
import { useState } from "react";

interface TeamFlagProps {
  countryCode: string;
  name: string;
  size?: number;
  shape?: "circle" | "rect";
}

export default function TeamFlag({ countryCode, name, size = 48, shape = "circle" }: TeamFlagProps) {
  const [error, setError] = useState(false);

  const width  = shape === "rect" ? Math.round(size * 4 / 3) : size;
  const height = size;
  const src    = shape === "rect"
    ? `https://flagcdn.io/flags/4x3/${countryCode}.svg`
    : `https://flagcdn.io/flags/1x1/${countryCode}.svg`;

  const isCircle = shape === "circle";

  const shadow = isCircle
    ? "0 4px 14px rgba(0,0,0,0.22), 0 1px 4px rgba(0,0,0,0.10)"
    : "0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08)";

  if (!countryCode || error) {
    return (
      <div
        className={`${isCircle ? "rounded-full" : "rounded-lg"} bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 text-slate-400 dark:text-slate-500 font-bold select-none`}
        style={{ width, height, fontSize: size * 0.45, boxShadow: shadow }}
      >
        ?
      </div>
    );
  }

  return (
    <div
      className={`${isCircle ? "rounded-full" : "rounded-lg"} overflow-hidden shrink-0 relative`}
      style={{ width, height, boxShadow: shadow }}
    >
      <Image
        src={src}
        alt={`Bandera de ${name}`}
        width={width}
        height={height}
        className="w-full h-full object-cover"
        unoptimized
        onError={() => setError(true)}
      />
      {/* Brillo sutil — efecto badge/pin de juguete */}
      {isCircle && (
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: "linear-gradient(145deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.06) 45%, transparent 60%)",
          }}
        />
      )}
    </div>
  );
}
