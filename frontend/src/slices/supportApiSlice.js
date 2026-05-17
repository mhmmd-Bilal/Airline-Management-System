// slices/supportApiSlice.js
import { apiSlice } from "./apiSlice";

const SUPPORT_URL = "/api/support";

const supportApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({

    /* Passenger */
    createTicket: builder.mutation({
      query: (data) => ({ url: SUPPORT_URL, method: "POST", body: data }),
      invalidatesTags: ["Support"],
    }),

    getMyTickets: builder.query({
      query: ({ status = "all", page = 1, limit = 10 } = {}) => ({
        url: `${SUPPORT_URL}/my?status=${status}&page=${page}&limit=${limit}`,
      }),
      providesTags: ["Support"],
    }),

    getTicketById: builder.query({
      query: (id) => ({ url: `${SUPPORT_URL}/${id}` }),
      providesTags: ["Support"],
    }),

    replyToTicket: builder.mutation({
      query: ({ id, message }) => ({
        url: `${SUPPORT_URL}/${id}/reply`,
        method: "POST",
        body: { message },
      }),
      invalidatesTags: ["Support"],
    }),

    /* Admin */
    getAllTickets: builder.query({
      query: ({ status = "all", priority = "all", category = "all", search = "", page = 1, limit = 15 } = {}) => ({
        url: `${SUPPORT_URL}?status=${status}&priority=${priority}&category=${category}&search=${search}&page=${page}&limit=${limit}`,
      }),
      providesTags: ["Support"],
    }),

    updateTicketStatus: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${SUPPORT_URL}/${id}/status`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Support"],
    }),

    deleteTicket: builder.mutation({
      query: (id) => ({ url: `${SUPPORT_URL}/${id}`, method: "DELETE" }),
      invalidatesTags: ["Support"],
    }),

    /* Crew */
    getTicketsByFlight: builder.query({
      query: ({ flightId, status = "all", page = 1 }) => ({
        url: `${SUPPORT_URL}/flight/${flightId}?status=${status}&page=${page}`,
      }),
      providesTags: ["Support"],
    }),

  }),
});

export const {
  useCreateTicketMutation,
  useGetMyTicketsQuery,
  useGetTicketByIdQuery,
  useReplyToTicketMutation,
  useGetAllTicketsQuery,
  useUpdateTicketStatusMutation,
  useDeleteTicketMutation,
  useGetTicketsByFlightQuery,
} = supportApiSlice;