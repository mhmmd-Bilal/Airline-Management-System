// services/socketService.js
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import Users from "../models/userModel.js";

/* -------------------------------------------------------------------------- */
/*                              MODULE STATE                                  */
/* -------------------------------------------------------------------------- */

let io = null;

/* -------------------------------------------------------------------------- */
/*                            INITIALISE SOCKET.IO                           */
/* -------------------------------------------------------------------------- */

/**
 * Call once in server.js after httpServer is created.
 *
 * Usage in server.js:
 *   import { initSocket } from "./services/socketService.js";
 *   const httpServer = createServer(app);
 *   initSocket(httpServer);
 *   httpServer.listen(PORT);
 */
export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
    /* Reconnection handled client-side */
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  /* ── JWT auth middleware ── */
  io.use(async (socket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || "");

      const token = cookies.authToken;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const UserDetails = await Users.findById(decoded.userId).select(
        "-password",
      );

      socket.user = UserDetails;

      next();
    } catch (error) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const { _id, role, name } = socket.user;
    console.log(
      `[socket] connected  user=${name}  role=${role}  id=${socket.id}`,
    );

    // ── Auto-join personal + role rooms ──────────────────────
    socket.join(`user:${_id}`);
    socket.join(`role:${role}`);
    socket.join("role:all");

    // ── Admins auto-join admin_feed ───────────────────────────
    if (role === "admin") {
      socket.join("admin_feed");
      console.log(`[socket] ${name} auto-joined admin_feed`);
    }

    // ── Join ticket room ──────────────────────────────────────
    socket.on("join_ticket", (ticketId) => {
      if (!ticketId) return;
      const room = `ticket:${ticketId}`;
      socket.join(room);
      const size = io.sockets.adapter.rooms.get(room)?.size ?? 0;
      console.log(
        `[socket] ${name} (${role}) joined ${room} — members: ${size}`,
      );
    });

    // ── Leave ticket room ─────────────────────────────────────
    socket.on("leave_ticket", (ticketId) => {
      if (!ticketId) return;
      socket.leave(`ticket:${ticketId}`);
      console.log(`[socket] ${name} left ticket:${ticketId}`);
    });

    // ── Typing indicator ──────────────────────────────────────
    socket.on("typing", ({ ticketId, isTyping }) => {
      socket.to(`ticket:${ticketId}`).emit("user_typing", {
        userId: _id,
        name,
        role,
        isTyping,
      });
    });

    socket.on("disconnect", (reason) => {
      console.log(`[socket] disconnected  user=${name}  reason=${reason}`);
    });
  });

  console.log("[socket] Socket.io initialised");
  return io;
}

export function emitNotification(notification) {
  if (!io) return;

  const payload = {
    _id: String(notification._id),
    title: notification.title,
    message: notification.message,
    type: notification.type,
    isRead: false,
    relatedId: notification.relatedId ?? null,
    relatedModel: notification.relatedModel ?? null,
    createdAt: notification.createdAt ?? new Date(),
  };

  if (notification.recipient) {
    io.to(`user:${notification.recipient}`).emit("notification", payload);
  } else {
    io.to(`role:${notification.roleTarget ?? "all"}`).emit(
      "notification",
      payload,
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                            EMIT HELPERS                                    */
/* -------------------------------------------------------------------------- */
/* Called from controllers after DB operations */

/**
 * Emit a new message to everyone in the ticket room.
 * @param {string} ticketId
 * @param {object} message  — populated message subdoc
 * @param {object} ticket   — full populated ticket (for unread badges)
 */
export function emitNewMessage(ticketId, message, ticket) {
  if (!io) return;
  const room = `ticket:${ticketId}`;
  const members = io.sockets.adapter.rooms.get(room)?.size ?? 0;
  console.log(`[socket] emitNewMessage → ${room}  members=${members}`);
  io.to(room).emit("new_message", {
    ticketId,
    message,
    unreadByAdmin: ticket.unreadByAdmin,
    unreadByUser: ticket.unreadByUser,
  });
}

/**
 * Emit a ticket status/priority update to everyone in the room.
 * Also emits to a global admin room so the dashboard list updates.
 * @param {string} ticketId
 * @param {object} ticket   — full populated ticket
 */
export function emitTicketUpdated(ticketId, ticket) {
  if (!io) return;
  /* Room-specific update */
  io.to(`ticket:${ticketId}`).emit("ticket_updated", { ticketId, ticket });
  /* Global admin feed — admins join "admin_feed" on connect */
  io.to("admin_feed").emit("ticket_list_updated", {
    ticketId,
    status: ticket.status,
    priority: ticket.priority,
    unreadByAdmin: ticket.unreadByAdmin,
  });
}

/**
 * Emit a new ticket event to the global admin feed.
 * Called when a passenger creates a new ticket.
 */
export function emitNewTicket(ticket) {
  if (!io) return;
  io.to("admin_feed").emit("new_ticket", { ticket });
}

/**
 * Get the io instance (for custom use in other modules).
 */
export function getIO() {
  return io;
}
