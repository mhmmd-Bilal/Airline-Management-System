import { apiSlice } from "./apiSlice";

const CREW_URL = "/api/crew";

const crewApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
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

    // GET /api/crew/:id
    getCrewByUserId: builder.query({
      query: (userId) => ({ url: `${CREW_URL}/by-user/${userId}` }),
      providesTags: ["Crew"],
    }),

    // POST /api/crew — creates User + Crew in one call
    createCrew: builder.mutation({
      query: (data) => ({
        url: CREW_URL,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Crew"],
    }),

    // PUT /api/crew/:id — updates User + Crew in one call
    updateCrew: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${CREW_URL}/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Crew"],
    }),

    // PATCH /api/crew/:id/status — lightweight status update
    updateCrewStatus: builder.mutation({
      query: ({ id, currentStatus }) => ({
        url: `${CREW_URL}/${id}/status`,
        method: "PATCH",
        body: { currentStatus },
      }),
      invalidatesTags: ["Crew"],
    }),

    // DELETE /api/crew/:id — deletes User + Crew
    deleteCrew: builder.mutation({
      query: (id) => ({
        url: `${CREW_URL}/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Crew"],
    }),
  }),
});

export const {
  useGetAllCrewQuery,
  useGetCrewStatsQuery,
  useCreateCrewMutation,
  useUpdateCrewMutation,
  useUpdateCrewStatusMutation,
  useDeleteCrewMutation,
  useGetCrewByUserIdQuery
} = crewApiSlice;
