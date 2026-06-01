import type { CSSProperties } from "react";

interface UserAvatarProps {
  avatarUrl?: string;
  displayName: string;
  size: number;
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const PALETTE = [
  { bg: "#011E41", fg: "#ffffff" },
  { bg: "#C8102E", fg: "#ffffff" },
  { bg: "#1d4ed8", fg: "#ffffff" },
  { bg: "#15803d", fg: "#ffffff" },
  { bg: "#b45309", fg: "#ffffff" },
  { bg: "#7c3aed", fg: "#ffffff" },
  { bg: "#0f766e", fg: "#ffffff" },
  { bg: "#be123c", fg: "#ffffff" },
];

function pickColor(name: string): { bg: string; fg: string } {
  const hash = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return PALETTE[hash % PALETTE.length];
}

function fontSize(size: number): string {
  if (size <= 20) return "10px";
  if (size <= 28) return "11px";
  if (size <= 36) return "12px";
  if (size <= 48) return "14px";
  if (size <= 72) return "20px";
  return "28px";
}

/**
 * Renders a circular avatar.
 * Shows initials when avatarUrl is absent.
 * Future: replace with next/image once Supabase Storage is connected.
 */
export default function UserAvatar({ avatarUrl, displayName, size, className = "" }: UserAvatarProps) {
  const { bg, fg } = pickColor(displayName);

  const style: CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    borderRadius: "50%",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: fontSize(size),
    fontWeight: 800,
    background: bg,
    color: fg,
    userSelect: "none",
    lineHeight: 1,
    letterSpacing: "0.02em",
  };

  if (avatarUrl) {
    return (
      <div style={style} className={`shrink-0 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={displayName}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    );
  }

  return (
    <div style={style} className={`shrink-0 ${className}`} aria-label={displayName} title={displayName}>
      {getInitials(displayName)}
    </div>
  );
}
