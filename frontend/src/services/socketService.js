// src/services/socketService.js
import { io } from "socket.io-client";

let socket = null;

export function getSocket() {
  // reuse if exists — connected or reconnecting
  if (socket) return socket;

  socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:4000", {
    withCredentials: true, // sends authToken cookie
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1500,
  });

  socket.on("connect", () => console.log("[socket] connected:", socket.id));
  socket.on("connect_error", (e) => console.warn("[socket] error:", e.message));
  socket.on("disconnect", (r) => console.log("[socket] disconnected:", r));

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

// ── The key fix: queue the emit if not yet connected ─────
export function joinTicketRoom(ticketId) {
  if (!ticketId) return;
  const s = getSocket();

  if (s.connected) {
    s.emit("join_ticket", ticketId);
    console.log("[socket] join_ticket →", ticketId);
  } else {
    // socket exists but handshake not complete yet — wait for connect
    s.once("connect", () => {
      s.emit("join_ticket", ticketId);
      console.log("[socket] join_ticket (after connect) →", ticketId);
    });
  }
}

export function leaveTicketRoom(ticketId) {
  if (!ticketId) return;
  socket?.connected && socket.emit("leave_ticket", ticketId);
}

export function emitTyping(ticketId, isTyping) {
  socket?.connected && socket.emit("typing", { ticketId, isTyping });
}

// admin_feed is now joined server-side automatically — this is a no-op
export function joinAdminFeed() {}

export function subscribeToNotifications(onNotif) {
  const s = getSocket();
  s.on("notification", onNotif);
  return () => s.off("notification", onNotif);
}
