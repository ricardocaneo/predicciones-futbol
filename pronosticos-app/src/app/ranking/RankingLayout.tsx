"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ChatBox, { type ChatMessage } from "@/components/ChatBox";

type ProfileEntry = { display_name: string; avatar_url: string | null };

export default function RankingLayout({
  children,
  headerSlot,
  initialMessages,
  profileMap,
  currentUserId,
  initialUnread,
}: {
  children: React.ReactNode;
  headerSlot: React.ReactNode;
  initialMessages: ChatMessage[];
  profileMap: Record<string, ProfileEntry>;
  currentUserId: string | null;
  initialUnread: number;
}) {
  const supabase = createClient();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [unread, setUnread] = useState(initialUnread);
  const [chatOpen, setChatOpen] = useState(false);         // desktop
  const [mobileCollapsed, setMobileCollapsed] = useState(true); // mobile

  // Refs para evitar stale closures en el callback de Realtime
  const chatOpenRef = useRef(chatOpen);
  const mobileCollapsedRef = useRef(mobileCollapsed);

  useEffect(() => { chatOpenRef.current = chatOpen; }, [chatOpen]);
  useEffect(() => { mobileCollapsedRef.current = mobileCollapsed; }, [mobileCollapsed]);

  // Suscripción Realtime única (centralizada aquí, no en ChatBox)
  useEffect(() => {
    const channel = supabase
      .channel("ranking_chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const row = payload.new as { id: string; user_id: string; message: string; created_at: string };
          const profile = profileMap[row.user_id];
          setMessages((prev) => [
            ...prev,
            {
              ...row,
              display_name: profile?.display_name ?? "Usuario",
              avatar_url: profile?.avatar_url ?? null,
            },
          ]);

          // Incrementar no leídos solo si el chat no está visible y no es mensaje propio
          const isVisible = chatOpenRef.current || !mobileCollapsedRef.current;
          if (row.user_id !== currentUserId && !isVisible) {
            setUnread((n) => n + 1);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("[chat] Realtime subscription failed:", status, err);
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [supabase, profileMap, currentUserId]);

  async function markAsRead() {
    setUnread(0);
    if (!currentUserId) return;
    await supabase
      .from("profiles")
      .update({ last_read_at: new Date().toISOString() })
      .eq("id", currentUserId);
  }

  function openChat() {
    setChatOpen(true);
    chatOpenRef.current = true;
    markAsRead();
  }

  function closeChat() {
    setChatOpen(false);
    chatOpenRef.current = false;
  }

  function toggleMobile() {
    const next = !mobileCollapsed;
    setMobileCollapsed(next);
    mobileCollapsedRef.current = next;
    if (!next) markAsRead(); // expandir = leer
  }

  return (
    <>
      {/* Ranking — siempre full width */}
      <div className="space-y-6">
        {headerSlot}

        {/* Mobile: chat justo después del resumen */}
        <div className="md:hidden">
          <ChatBox
            messages={messages}
            unreadCount={unread}
            mobileCollapsed={mobileCollapsed}
            onMobileToggle={toggleMobile}
            currentUserId={currentUserId}
          />
        </div>

        {children}
      </div>

      {/* Desktop: panel flotante */}
      <div
        className={`hidden md:flex flex-col fixed bottom-20 right-6 w-85 h-125 z-40 shadow-2xl rounded-2xl overflow-hidden transition-all duration-200 origin-bottom-right ${
          chatOpen
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <ChatBox
          messages={messages}
          unreadCount={unread}
          mobileCollapsed={false}
          onMobileToggle={() => {}}
          currentUserId={currentUserId}
        />
      </div>

      {/* Botón toggle desktop con badge de no leídos */}
      <button
        onClick={chatOpen ? closeChat : openChat}
        className="hidden md:flex fixed bottom-6 right-6 w-12 h-12 rounded-full bg-wc-navy text-white items-center justify-center shadow-lg z-50 text-xl transition-transform duration-200 hover:scale-110"
        title={chatOpen ? "Cerrar chat" : "Abrir chat"}
      >
        {chatOpen ? "✕" : "💬"}
        {!chatOpen && unread > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-wc-red text-white text-[11px] font-bold">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
    </>
  );
}
