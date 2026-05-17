// src/services/socketService.js
import { io } from "socket.io-client";

/* -------------------------------------------------------------------------- */
/*                           SINGLETON SOCKET                                 */
/* -------------------------------------------------------------------------- */

let socket = null;

/**
 * Initialise (or return existing) socket connection.
 * Call this once after login, passing the JWT token from Redux store.
 *
 * Usage:
 *   import { getSocket } from "../services/socketService";
 *   const socket = getSocket(token);
 */
export function getSocket() {
  if (socket?.connected) return socket;

  socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:4000", {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1500,
    autoConnect: true,
    withCredentials: true,
  });

  socket.on("connect", () => {
    console.log("[socket] connected:", socket.id);
    /* Admin joins the global feed room for new ticket notifications */
  });

  socket.on("connect_error", (err) => {
    console.warn("[socket] connection error:", err.message);
  });

  socket.on("disconnect", (reason) => {
    console.log("[socket] disconnected:", reason);
  });

  return socket;
}

/**
 * Disconnect and destroy the socket.
 * Call on logout.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Join a ticket room to receive real-time updates for that ticket.
 */
export function joinTicketRoom(ticketId) {
  if (socket?.connected) {
    socket.emit("join_ticket", ticketId);
  }
}

/**
 * Leave a ticket room.
 */
export function leaveTicketRoom(ticketId) {
  if (socket?.connected) {
    socket.emit("leave_ticket", ticketId);
  }
}

/**
 * Emit typing indicator.
 */
export function emitTyping(ticketId, isTyping) {
  if (socket?.connected) {
    socket.emit("typing", { ticketId, isTyping });
  }
}

/**
 * Join admin global feed room.
 * Admins join this to receive new_ticket and ticket_list_updated events.
 */
export function joinAdminFeed() {
  if (socket?.connected) {
    socket.emit("join_ticket", "admin_feed");
  }
}
