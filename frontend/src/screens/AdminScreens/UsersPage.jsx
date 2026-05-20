// src/pages/admin/UsersPage.jsx
import { useState } from "react";
import { Th, Td } from "../../components/admin/shared/AdminTable";
import Badge      from "../../components/admin/shared/Badge";
import Avatar     from "../../components/admin/shared/Avatar";
import { apiSlice } from "../../slices/apiSlice";

// ── Inline user API (add to your userApiSlice or here temporarily) ──────────
// Add these to your userApiSlice.js:
//   getAllUsers:   GET /api/users?role=&search=&page=&limit=
//   getUserById:  GET /api/users/:id
//   updateUser:   PUT /api/users/:id
//   deleteUser:   DELETE /api/users/:id
//   getUserStats: GET /api/users/stats
// For now we'll use RTK Query inline injection:
import { useSelector } from "react-redux";

const usersApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    getUserStats: b.query({
      query: () => ({ url: "/api/users/stats" }),
      providesTags: ["User"],
    }),
    getAllUsers: b.query({
      query: ({ role = "all", search = "", page = 1, limit = 15 } = {}) => ({
        url: "/api/users",
        params: { role, search, page, limit },
      }),
      providesTags: ["User"],
    }),
    deleteUser: b.mutation({
      query: (id) => ({ url: `/api/users/${id}`, method: "DELETE" }),
      invalidatesTags: ["User"],
    }),
  }),
  overrideExisting: false,
});

const { useGetUserStatsQuery, useGetAllUsersQuery, useDeleteUserMutation } = usersApi;

// ── Helpers ────────────────────────────────────────────
const fmt = (dt) =>
  dt ? new Date(dt).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  }) : "—";

const ROLE_CFG = {
  admin:     { cls: "bg-violet-50 text-violet-700", label: "Admin"     },
  crew:      { cls: "bg-blue-50 text-blue-700",     label: "Crew"      },
  passenger: { cls: "bg-green-50 text-green-700",   label: "Passenger" },
};

function StatCard({ label, value, icon, color, loading }) {
  return (
    <div className="bg-white border border-[#D0E6F7] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-medium text-[#7A90A4] uppercase tracking-[0.6px]">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <i className={`ti ${icon} text-[15px]`} />
        </div>
      </div>
      {loading
        ? <div className="h-8 bg-[#EAF4FB] rounded-lg animate-pulse w-20" />
        : <p className="text-[26px] font-semibold text-[#0D1B2A] leading-none">{value ?? "—"}</p>}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[14px] font-semibold text-[#0D1B2A]">{title}</p>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition cursor-pointer">
            <i className="ti ti-x text-[14px]" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [role,   setRole]   = useState("all");
  const [search, setSearch] = useState("");
  const [page,   setPage]   = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: statsData, isLoading: stLoading } = useGetUserStatsQuery();
  const { data, isLoading } = useGetAllUsersQuery({ role, search, page, limit: 15 });
  const [deleteUser, { isLoading: deleting }] = useDeleteUserMutation();

  const users      = data?.data       ?? [];
  const total      = data?.total      ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const stats      = statsData?.data;

  const handleDelete = async () => {
    try {
      await deleteUser(deleteTarget._id).unwrap();
      setDeleteTarget(null);
    } catch (err) { console.error(err); }
  };

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <StatCard label="Total Users"    value={stats?.total}      icon="ti-users"        color="bg-blue-50 text-blue-700"    loading={stLoading} />
        <StatCard label="Passengers"     value={stats?.passengers}  icon="ti-armchair"     color="bg-green-50 text-green-700"  loading={stLoading} />
        <StatCard label="Crew Members"   value={stats?.crew}        icon="ti-id-badge"     color="bg-violet-50 text-violet-700"loading={stLoading} />
        <StatCard label="Admins"         value={stats?.admins}      icon="ti-shield"       color="bg-orange-50 text-orange-700"loading={stLoading} />
      </div>

      <div className="bg-white border border-[#D0E6F7] rounded-2xl p-5">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <p className="text-[11px] font-semibold text-[#5A7089] uppercase tracking-[0.8px]">
            All users <span className="text-[#B0C4D8] font-normal">({total})</span>
          </p>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-[#B0C4D8] text-[13px]" />
              <input
                className="h-9 pl-8 pr-3 text-[12px] bg-[#F0F7FF] border border-[#D0E6F7] rounded-lg outline-none focus:border-[#1565C0] transition w-44 placeholder:text-[#B0C4D8] text-[#0D1B2A]"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <select
              className="h-9 px-3 text-[12px] bg-[#F0F7FF] border border-[#D0E6F7] rounded-lg outline-none focus:border-[#1565C0] text-[#0D1B2A] cursor-pointer"
              value={role}
              onChange={(e) => { setRole(e.target.value); setPage(1); }}
            >
              <option value="all">All roles</option>
              <option value="passenger">Passenger</option>
              <option value="crew">Crew</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr>
                <Th>User</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Phone</Th>
                <Th>Joined</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-[#EAF4FB] rounded animate-pulse w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10">
                    <i className="ti ti-user-off text-[32px] text-[#D0E6F7] block mb-2" />
                    <p className="text-[13px] text-[#7A90A4]">No users found</p>
                  </td>
                </tr>
              ) : users.map((u) => {
                const roleCfg = ROLE_CFG[u.role] || ROLE_CFG.passenger;
                return (
                  <tr key={u._id} className="hover:bg-[#F8FBFF] transition">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.name} size="sm" />
                        <p className="text-[12px] font-semibold text-[#0D1B2A] truncate max-w-[120px]">{u.name}</p>
                      </div>
                    </Td>
                    <Td><p className="text-[12px] text-[#7A90A4] truncate max-w-[160px]">{u.email}</p></Td>
                    <Td>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${roleCfg.cls}`}>
                        {roleCfg.label}
                      </span>
                    </Td>
                    <Td><p className="text-[12px] text-[#7A90A4]">{u.phone || "—"}</p></Td>
                    <Td><p className="text-[12px] text-[#7A90A4]">{fmt(u.createdAt)}</p></Td>
                    <Td>
                      <button
                        onClick={() => setDeleteTarget(u)}
                        className="w-7 h-7 rounded-md border border-red-100 bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition cursor-pointer"
                        title="Delete user"
                      >
                        <i className="ti ti-trash text-[12px]" />
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#EAF4FB]">
            <p className="text-[11px] text-[#B0C4D8]">Showing {users.length} of {total} users</p>
            <div className="flex items-center gap-1.5">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition disabled:opacity-40 cursor-pointer">
                <i className="ti ti-chevron-left text-[13px]" />
              </button>
              <span className="text-[12px] text-[#7A90A4] px-1">{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
                className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition disabled:opacity-40 cursor-pointer">
                <i className="ti ti-chevron-right text-[13px]" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete modal */}
      {deleteTarget && (
        <Modal title="Delete user" onClose={() => setDeleteTarget(null)}>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <i className="ti ti-user-x text-red-500 text-[22px]" />
            </div>
            <p className="text-[14px] font-semibold text-[#0D1B2A] mb-1">Delete {deleteTarget.name}?</p>
            <p className="text-[12px] text-[#7A90A4] mb-5">
              This will permanently remove the user and all associated data.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 h-10 border border-[#D0E6F7] bg-[#F0F7FF] text-[#1565C0] text-[13px] font-medium rounded-[10px] cursor-pointer hover:bg-[#E1EFFE] transition">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 h-10 bg-red-500 hover:bg-red-600 text-white text-[13px] font-bold rounded-[10px] border-none cursor-pointer disabled:opacity-60 transition">
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}