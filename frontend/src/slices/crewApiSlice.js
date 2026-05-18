// slices/crewApiSlice.js
import { apiSlice } from "./apiSlice";

const CREW_URL = "/api/crew";

const crewApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({

    // GET /api/crew/me — logged-in crew member's own profile (no param needed)
    getMyCrewProfile: builder.query({
      query: () => ({ url: `${CREW_URL}/me` }),
      providesTags: ["Crew"],
    }),

    // GET /api/crew?role=&currentStatus=&medicalStatus=&search=&page=&limit=
    getAllCrew: builder.query({
      query: ({
        role = "all",
        currentStatus = "all",
        medicalStatus = "all",
        search = "",
        page = 1,
        limit = 10,
      } = {}) => ({
        url: CREW_URL,
        params: { role, currentStatus, medicalStatus, search, page, limit },
      }),
      providesTags: ["Crew"],
    }),

    // GET /api/crew/stats
    getCrewStats: builder.query({
      query: () => ({ url: `${CREW_URL}/stats` }),
      providesTags: ["Crew"],
    }),

    // GET /api/crew/by-user/:userId
    getCrewByUserId: builder.query({
      query: (userId) => ({ url: `${CREW_URL}/by-user/${userId}` }),
      providesTags: ["Crew"],
    }),

    // POST /api/crew
    createCrew: builder.mutation({
      query: (data) => ({ url: CREW_URL, method: "POST", body: data }),
      invalidatesTags: ["Crew"],
    }),

    // PUT /api/crew/:id
    updateCrew: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${CREW_URL}/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Crew"],
    }),

    // PATCH /api/crew/:id/status
    updateCrewStatus: builder.mutation({
      query: ({ id, currentStatus }) => ({
        url: `${CREW_URL}/${id}/status`,
        method: "PATCH",
        body: { currentStatus },
      }),
      invalidatesTags: ["Crew"],
    }),

    // DELETE /api/crew/:id
    deleteCrew: builder.mutation({
      query: (id) => ({ url: `${CREW_URL}/${id}`, method: "DELETE" }),
      invalidatesTags: ["Crew"],
    }),
  }),
});

export const {
  useGetMyCrewProfileQuery,      // ← new
  useGetAllCrewQuery,
  useGetCrewStatsQuery,
  useGetCrewByUserIdQuery,
  useCreateCrewMutation,
  useUpdateCrewMutation,
  useUpdateCrewStatusMutation,
  useDeleteCrewMutation,
} = crewApiSlice;