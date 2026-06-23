"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import UserAvatar from "./UserAvatar";

export type ChatMessage = {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  display_name: string;
  avatar_url: string | null;
};

const EMOJI_CATEGORIES = [
  {
    icon: "⚽",
    label: "Fútbol",
    emojis: ["⚽","🏆","🥅","🎯","🏅","🥇","🏟️","🧤","👟","🦵","⭐","🌟","🔴","🟡","📋","🃏"],
  },
  {
    icon: "😄",
    label: "Reacciones",
    emojis: ["😂","🤣","😭","🤩","😤","😱","😅","🥹","😮","🤯","😍","🤔","😒","🙄","😵","🤦"],
  },
  {
    icon: "🎉",
    label: "Celebración",
    emojis: ["🎉","🎊","🥳","🔥","💥","✨","🚀","💃","🕺","🎶","🪩","🎈","💫","🏄","🤸","🙆"],
  },
  {
    icon: "👏",
    label: "Gestos",
    emojis: ["👏","💪","🙌","👍","👎","🫡","✌️","🤞","👊","🫶","❤️","💔","🙏","🤝","👀","🤷"],
  },
];

export default function ChatBox({
  messages,
  unreadCount,
  mobileCollapsed,
  onMobileToggle,
  currentUserId,
}: {
  messages: ChatMessage[];
  unreadCount: number;
  mobileCollapsed: boolean;
  onMobileToggle: () => void;
  currentUserId: string | null;
}) {
  const supabase = createClient();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const messagesRef = useRef<HTMLDivElement>(null);
  const mobileChatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevCollapsed = useRef(mobileCollapsed);

  // Scroll interno al fondo cuando llegan mensajes nuevos (no mueve la página)
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Al expandir en mobile: scroll interno al fondo + llevar el header a la vista
  useEffect(() => {
    if (prevCollapsed.current && !mobileCollapsed) {
      const el = messagesRef.current;
      if (el) el.scrollTop = el.scrollHeight;
      setTimeout(() => {
        mobileChatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
    prevCollapsed.current = mobileCollapsed;
  }, [mobileCollapsed]);

  async function send() {
    const msg = input.trim();
    if (!msg || !currentUserId || sending) return;
    setInput("");
    setShowEmojis(false);
    setSending(true);
    await supabase.from("chat_messages").insert({ user_id: currentUserId, message: msg });
    setSending(false);
  }

  function insertEmoji(emoji: string) {
    setInput((prev) => prev + emoji);
    setShowEmojis(false);
    inputRef.current?.focus();
  }

  const messageList = (
    <div ref={messagesRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
      {messages.length === 0 && (
        <p className="text-xs text-slate-400 text-center pt-8">Sé el primero en escribir algo</p>
      )}
      {messages.map((msg) => {
        const isMe = msg.user_id === currentUserId;
        return (
          <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
            <UserAvatar displayName={msg.display_name} avatarUrl={msg.avatar_url ?? undefined} size={28} />
            <div className={`max-w-[78%] flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
              {!isMe && (
                <span className="text-[11px] text-slate-400 font-medium px-1">{msg.display_name}</span>
              )}
              <div className={`px-3 py-1.5 rounded-2xl text-sm leading-snug wrap-break-word ${
                isMe
                  ? "bg-wc-navy text-white rounded-tr-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm"
              }`}>
                {msg.message}
              </div>
              <span className="text-[10px] text-slate-400 px-1">
                {new Date(msg.created_at).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  const inputArea = currentUserId ? (
    <div className="shrink-0 border-t border-slate-100 dark:border-slate-800">
      {showEmojis && (
        <div className="border-b border-slate-200 dark:border-slate-700">
          {/* Tabs de categoría */}
          <div className="flex px-2 pt-1 bg-slate-100 dark:bg-slate-800 rounded-t-lg">
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={cat.label}
                type="button"
                onClick={() => setActiveCategory(i)}
                title={cat.label}
                className={`flex-1 py-1.5 text-lg -mb-px border-b-2 transition-all rounded-t-md ${
                  activeCategory === i
                    ? "bg-white dark:bg-slate-900 border-wc-navy dark:border-white"
                    : "border-transparent text-slate-400 hover:text-slate-500 dark:hover:text-slate-300"
                }`}
              >
                {cat.icon}
              </button>
            ))}
          </div>
          {/* Grid de emojis */}
          <div className="grid grid-cols-8 gap-0.5 px-3 pt-1 pb-2">
            {EMOJI_CATEGORIES[activeCategory].emojis.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => insertEmoji(e)}
                className="text-xl h-9 w-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="px-3 pb-3 pt-2 flex gap-2">
        <button
          type="button"
          onClick={() => setShowEmojis((v) => !v)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 text-lg transition-colors"
          aria-label="Emojis"
        >
          😊
        </button>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe un mensaje..."
          maxLength={500}
          disabled={sending}
          className="flex-1 text-sm bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-wc-navy/30 dark:text-white placeholder:text-slate-400 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="w-9 h-9 rounded-full bg-wc-navy text-white flex items-center justify-center disabled:opacity-40 shrink-0 text-lg leading-none"
          aria-label="Enviar"
        >
          ↑
        </button>
      </form>
    </div>
  ) : (
    <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
      <p className="text-xs text-slate-400 text-center">Inicia sesión para participar</p>
    </div>
  );

  // ── Desktop: panel completo sin comportamiento de colapso ──
  const desktopPanel = (
    <div className="hidden md:flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <p className="text-sm font-bold text-slate-800 dark:text-white">Chat</p>
      </div>
      {messageList}
      {inputArea}
    </div>
  );

  // ── Mobile: colapsable con badge de no leídos ──
  const mobilePanel = (
    <div ref={mobileChatRef} className="md:hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <button
        onClick={onMobileToggle}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800"
      >
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-slate-800 dark:text-white">Chat</p>
          {mobileCollapsed && unreadCount > 0 && (
            <span className="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-wc-red text-white text-[11px] font-bold">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        <span className="text-slate-400 text-sm">{mobileCollapsed ? "▲" : "▼"}</span>
      </button>

      {!mobileCollapsed && (
        <div className="flex flex-col h-105">
          {messageList}
          {inputArea}
        </div>
      )}
    </div>
  );

  return (
    <>
      {desktopPanel}
      {mobilePanel}
    </>
  );
}
