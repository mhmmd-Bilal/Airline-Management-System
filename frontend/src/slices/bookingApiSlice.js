// slices/bookingApiSlice.js
import { apiSlice } from "./apiSlice";

const BOOKING_URL = "/api/bookings";

export async function triggerPdfDownload(url, filename, getState) {
  // Pull the auth token from Redux state so the request is authenticated
  const token = getState().auth?.userData?.token;

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Download failed");
  }

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}

const bookingApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMyBookings: builder.query({
      query: () => ({ url: `${BOOKING_URL}/my` }),
      providesTags: ["Booking"],
    }),

    getBookingById: builder.query({
      query: (id) => ({ url: `${BOOKING_URL}/${id}` }),
      providesTags: ["Booking"],
    }),

    // Returns booked seats for a specific flight — used by the seat map
    getFlightSeats: builder.query({
      query: (flightId) => ({ url: `${BOOKING_URL}/flight/${flightId}/seats` }),
      providesTags: ["Booking"],
    }),

    createOrder: builder.mutation({
      query: (data) => ({
        url: `${BOOKING_URL}/create-order`,
        method: "POST",
        body: data,
      }),
    }),

    verifyPayment: builder.mutation({
      query: (data) => ({
        url: `${BOOKING_URL}/verify-payment`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Booking"],
    }),

    // cancelBooking: builder.mutation({
    //   query: ({ id, reason }) => ({
    //     url: `${BOOKING_URL}/${id}/cancel`,
    //     method: "POST",
    //     body: { reason },
    //   }),
    //   invalidatesTags: ["Booking"],
    // }),

    getBookingStats: builder.query({
      query: () => ({ url: `${BOOKING_URL}/stats` }),
      providesTags: ["Booking"],
    }),
    getBookingsByFlightId: builder.query({
      query: ({ flightId, status = "all", page = 1, limit = 20 }) => ({
        url: `${BOOKING_URL}/flight/${flightId}`,
        params: { status, page, limit },
      }),
      providesTags: ["Booking"],
    }),
  }),
});

export const {
  useGetMyBookingsQuery,
  useGetBookingByIdQuery,
  useGetFlightSeatsQuery,
  useCreateOrderMutation,
  useVerifyPaymentMutation,
  // useCancelBookingMutation,
  useGetBookingStatsQuery,
  useGetBookingsByFlightIdQuery,
} = bookingApiSlice;
