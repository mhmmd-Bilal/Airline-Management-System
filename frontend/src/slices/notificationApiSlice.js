// slices/notificationApiSlice.js
import { apiSlice } from "./apiSlice";

const NOTIF_URL = "/api/notifications";

const notificationApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    /* All roles */
    getMyNotifications: builder.query({
      query: ({ page = 1, limit = 20, unreadOnly = false } = {}) => ({
        url: NOTIF_URL,
        params: { page, limit, unreadOnly },
      }),
      providesTags: ["Notification"],
    }),

    getUnreadCount: builder.query({
      query: () => ({ url: `${NOTIF_URL}/unread-count` }),
      providesTags: ["Notification"],
    }),

    markAsRead: builder.mutation({
      query: (id) => ({ url: `${NOTIF_URL}/${id}/read`, method: "PATCH" }),
      invalidatesTags: ["Notification"],
    }),

    markAllAsRead: builder.mutation({
      query: () => ({ url: `${NOTIF_URL}/read-all`, method: "PATCH" }),
      invalidatesTags: ["Notification"],
    }),

    deleteNotification: builder.mutation({
      query: (id) => ({ url: `${NOTIF_URL}/${id}`, method: "DELETE" }),
      invalidatesTags: ["Notification"],
    }),

    clearAllRead: builder.mutation({
      query: () => ({ url: `${NOTIF_URL}/clear-all`, method: "DELETE" }),
      invalidatesTags: ["Notification"],
    }),

    /* Admin only */
    broadcastNotification: builder.mutation({
      query: (data) => ({
        url: `${NOTIF_URL}/broadcast`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Notification"],
    }),

    getAllNotifications: builder.query({
      query: ({
        page = 1,
        limit = 20,
        type = "all",
        roleTarget = "all",
      } = {}) => ({
        url: `${NOTIF_URL}/all`,
        params: { page, limit, type, roleTarget },
      }),
      providesTags: ["Notification"],
    }),
  }),
});

export const {
  useGetMyNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useClearAllReadMutation,
  useBroadcastNotificationMutation,
  useGetAllNotificationsQuery,
} = notificationApiSlice;
