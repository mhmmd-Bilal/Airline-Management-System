// slices/userApiSlice.js
import { apiSlice } from "./apiSlice";

const USER_URL = "/api/users";

const userApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({

    /* ── Public ── */
    loginUser: builder.mutation({
      query: (data) => ({
        url:    `${USER_URL}/login`,
        method: "POST",
        body:   data,
      }),
    }),

    registerUser: builder.mutation({
      query: (data) => ({
        url:    `${USER_URL}/register`,
        method: "POST",
        body:   data,
      }),
    }),

    /* ── Authenticated ── */
    getMe: builder.query({
      query: () => ({ url: `${USER_URL}/me` }),
      providesTags: ["User"],
    }),

    /* ── Admin ── */
    getUserStats: builder.query({
      query: () => ({ url: `${USER_URL}/stats` }),
      providesTags: ["User"],
    }),

    getAllUsers: builder.query({
      query: ({ role = "all", search = "", page = 1, limit = 15 } = {}) => ({
        url:    USER_URL,
        params: { role, search, page, limit },
      }),
      providesTags: ["User"],
    }),

    getUserById: builder.query({
      query: (id) => ({ url: `${USER_URL}/${id}` }),
      providesTags: ["User"],
    }),

    updateUser: builder.mutation({
      query: ({ id, ...data }) => ({
        url:    `${USER_URL}/${id}`,
        method: "PUT",
        body:   data,
      }),
      invalidatesTags: ["User"],
    }),

    deleteUser: builder.mutation({
      query: (id) => ({
        url:    `${USER_URL}/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["User"],
    }),

  }),
  overrideExisting: false,
});

export const {
  useLoginUserMutation,
  useRegisterUserMutation,
  useGetMeQuery,
  useGetUserStatsQuery,
  useGetAllUsersQuery,
  useGetUserByIdQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = userApiSlice;