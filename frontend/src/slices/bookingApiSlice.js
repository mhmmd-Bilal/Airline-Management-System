// slices/bookingApiSlice.js
import { apiSlice } from "./apiSlice";

const BOOKING_URL = "/api/bookings";

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
        url:    `${BOOKING_URL}/create-order`,
        method: "POST",
        body:   data,
      }),
    }),

    verifyPayment: builder.mutation({
      query: (data) => ({
        url:    `${BOOKING_URL}/verify-payment`,
        method: "POST",
        body:   data,
      }),
      invalidatesTags: ["Booking"],
    }),

    cancelBooking: builder.mutation({
      query: ({ id, reason }) => ({
        url:    `${BOOKING_URL}/${id}/cancel`,
        method: "POST",
        body:   { reason },
      }),
      invalidatesTags: ["Booking"],
    }),

    getBookingStats: builder.query({
      query: () => ({ url: `${BOOKING_URL}/stats` }),
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
  useCancelBookingMutation,
  useGetBookingStatsQuery,
} = bookingApiSlice;