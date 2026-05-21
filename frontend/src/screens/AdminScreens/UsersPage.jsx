// src/pages/admin/UsersPage.jsx
import { useState } from "react";
import { Th, Td } from "../../components/admin/shared/AdminTable";
import Avatar from "../../components/admin/shared/Avatar";
import {
  useGetUserStatsQuery,
  useGetAllUsersQuery,
  useDeleteUserMutation,
} from "../../slices/userApiSlice";
import { useNavigate } from "react-router-dom";

// ── Helpers ────────────────────────────────────────────
const fmt = (dt) =>
  dt
    ? new Date(dt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const ROLE_CFG = {
  admin: {
    cls: "bg-violet-50 text-violet-700 border border-violet-200",
    label: "Admin",
    icon: "ti-shield",
  },
  crew: {
    cls: "bg-blue-50 text-blue-700 border border-blue-200",
    label: "Crew",
    icon: "ti-id-badge",
  },
  passenger: {
    cls: "bg-green-50 text-green-700 border border-green-200",
    label: "Passenger",
    icon: "ti-armchair",
  },
};

// ── Shared primitives ──────────────────────────────────
function StatCard({ label, value, icon, color, sub, loading }) {
  return (
    <div className="bg-white border border-[#D0E6F7] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-medium text-[#7A90A4] uppercase tracking-[0.6px]">
          {label}
        </p>
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}
        >
          <i className={`ti ${icon} text-[15px]`} />
        </div>
      </div>
      {loading ? (
        <div className="space-y-1.5">
          <div className="h-7 bg-[#EAF4FB] rounded-lg animate-pulse w-16" />
          <div className="h-3 bg-[#EAF4FB] rounded animate-pulse w-24" />
        </div>
      ) : (
        <>
          <p className="text-[26px] font-semibold text-[#0D1B2A] leading-none">
            {value ?? "—"}
          </p>
          {sub && <p className="text-[11px] text-[#7A90A4] mt-1">{sub}</p>}
        </>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#D0E6F7]">
          <p className="text-[14px] font-bold text-[#0D1B2A]">{title}</p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition cursor-pointer"
          >
            <i className="ti ti-x text-[14px]" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ── View user modal content ────────────────────────────
function UserDetailPanel({ user, onDelete }) {
  const roleCfg = ROLE_CFG[user.role] || ROLE_CFG.passenger;
  return (
    <div>
      {/* Avatar + name */}
      <div className="flex flex-col items-center text-center pb-5 mb-5 border-b border-[#EAF4FB]">
        <div className="w-16 h-16 rounded-2xl bg-[#EAF4FB] text-[#1565C0] flex items-center justify-center text-[24px] font-black mb-3">
          {user.name?.charAt(0).toUpperCase() || "?"}
        </div>
        <p className="text-[16px] font-bold text-[#0D1B2A]">{user.name}</p>
        <p className="text-[12px] text-[#7A90A4] mt-0.5">{user.email}</p>
        <span
          className={`mt-2 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full capitalize ${roleCfg.cls}`}
        >
          <i className={`ti ${roleCfg.icon} text-[11px]`} />
          {roleCfg.label}
        </span>
      </div>

      {/* Info rows */}
      <div className="space-y-0 mb-5">
        {[
          ["Phone", user.phone || "Not set"],
          ["Joined", fmt(user.createdAt)],
          ["User ID", user._id],
        ].map(([label, value], i) => (
          <div
            key={label}
            className={`flex justify-between items-center py-2.5 ${i > 0 ? "border-t border-[#EAF4FB]" : ""}`}
          >
            <span className="text-[12px] font-medium text-[#7A90A4]">
              {label}
            </span>
            <span className="text-[12px] font-semibold text-[#0D1B2A] text-right max-w-[60%] truncate">
              {value}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={onDelete}
        className="w-full h-10 border border-red-200 bg-red-50 text-red-600 text-[13px] font-semibold rounded-xl hover:bg-red-100 transition cursor-pointer flex items-center justify-center gap-2"
      >
        <i className="ti ti-trash text-[14px]" />
        Delete this user
      </button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────
export default function UsersPage() {
  // const [role, setRole] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewTarget, setViewTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: statsData, isLoading: stLoading } = useGetUserStatsQuery();
  const { data, isLoading, isFetching } = useGetAllUsersQuery({
    search,
    page,
    limit: 15,
  });
  const [deleteUser, { isLoading: deleting }] = useDeleteUserMutation();

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const stats = statsData?.data;

  const navigate = useNavigate();

  const handleDelete = async () => {
    try {
      await deleteUser(deleteTarget._id).unwrap();
      setDeleteTarget(null);
      setViewTarget(null);
    } catch (err) {
      console.error(err);
    }
  };

  const openDelete = (user) => {
    setViewTarget(null);
    setDeleteTarget(user);
  };

  return (
    <>
      {/* ── Stats ── */}
      {/* <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <StatCard
          label="Total Users"
          value={stats?.total}
          icon="ti-users"
          color="bg-blue-50 text-blue-700"
          sub={`${stats?.newThisMonth ?? 0} new this month`}
          loading={stLoading}
        />
        <StatCard
          label="Passengers"
          value={stats?.passengers}
          icon="ti-armchair"
          color="bg-green-50 text-green-700"
          sub="Registered travellers"
          loading={stLoading}
        />
        <StatCard
          label="Crew Members"
          value={stats?.crew}
          icon="ti-id-badge"
          color="bg-violet-50 text-violet-700"
          sub="Active staff"
          loading={stLoading}
        />
        <StatCard
          label="Admins"
          value={stats?.admins}
          icon="ti-shield"
          color="bg-orange-50 text-orange-700"
          sub="System administrators"
          loading={stLoading}
        />
      </div> */}

      {/* ── Table card ── */}
      <div className="bg-white border border-[#D0E6F7] rounded-2xl p-5">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <p className="text-[11px] font-semibold text-[#5A7089] uppercase tracking-[0.8px]">
            All users
            <span className="ml-1.5 text-[#B0C4D8] font-normal normal-case">
              ({total})
            </span>
          </p>
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search */}
            <div className="relative">
              <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-[#B0C4D8] text-[13px]" />
              <input
                className="h-9 pl-8 pr-3 text-[12px] bg-[#F0F7FF] border border-[#D0E6F7] rounded-lg outline-none focus:border-[#1565C0] transition w-48 placeholder:text-[#B0C4D8] text-[#0D1B2A]"
                placeholder="Search name or email…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div
          className={`overflow-x-auto transition-opacity ${isFetching ? "opacity-60" : "opacity-100"}`}
        >
          <table className="w-full min-w-[620px]">
            <thead>
              <tr>
                <Th>User</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th>Joined</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div
                          className="h-4 bg-[#EAF4FB] rounded animate-pulse"
                          style={{ width: `${48 + ((j * 13) % 40)}px` }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-14">
                    <i className="ti ti-user-off text-[36px] text-[#D0E6F7] block mb-3" />
                    <p className="text-[13px] font-semibold text-[#7A90A4]">
                      No users found
                    </p>
                    {search && (
                      <button
                        onClick={() => {
                          setSearch("");
                          setPage(1);
                        }}
                        className="mt-2 text-[12px] text-[#1565C0] font-semibold hover:underline bg-transparent border-none cursor-pointer"
                      >
                        Clear search
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isActive = viewTarget?._id === u._id;
                  return (
                    <tr
                      key={u._id}
                      className={`transition cursor-pointer ${isActive ? "bg-[#EAF4FB]" : "hover:bg-[#F8FBFF]"}`}
                      onClick={() => setViewTarget(isActive ? null : u)}
                    >
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#EAF4FB] text-[#1565C0] flex items-center justify-center text-[12px] font-bold flex-shrink-0">
                            {u.name?.charAt(0).toUpperCase() || "?"}
                          </div>
                          <p className="text-[12px] font-semibold text-[#0D1B2A] truncate max-w-[130px]">
                            {u.name}
                          </p>
                        </div>
                      </Td>
                      <Td>
                        <p className="text-[12px] text-[#7A90A4] truncate max-w-[170px]">
                          {u.email}
                        </p>
                      </Td>
                      <Td>
                        <p className="text-[12px] text-[#7A90A4]">
                          {u.phone || "—"}
                        </p>
                      </Td>
                      <Td>
                        <p className="text-[12px] text-[#7A90A4]">
                          {fmt(u.createdAt)}
                        </p>
                      </Td>
                      <Td>
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            // onClick={() => setViewTarget(isActive ? null : u)}
                            onClick={() => navigate(`/user/${u._id}`)}
                            className={`w-7 h-7 rounded-md border flex items-center justify-center transition cursor-pointer
                              ${
                                isActive
                                  ? "bg-[#1565C0] border-[#1565C0] text-white"
                                  : "border-[#D0E6F7] bg-[#F0F7FF] text-[#1565C0] hover:bg-[#E1EFFE]"
                              }`}
                            title="View details"
                          >
                            <i className="ti ti-eye text-[12px]" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="w-7 h-7 rounded-md border border-red-100 bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition cursor-pointer"
                            title="Delete user"
                          >
                            <i className="ti ti-trash text-[12px]" />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#EAF4FB]">
            <p className="text-[11px] text-[#B0C4D8]">
              Showing {users.length} of {total} users
            </p>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition disabled:opacity-40 cursor-pointer"
              >
                <i className="ti ti-chevron-left text-[13px]" />
              </button>
              <span className="text-[12px] text-[#7A90A4] px-1">
                {page} / {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition disabled:opacity-40 cursor-pointer"
              >
                <i className="ti ti-chevron-right text-[13px]" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── View panel (slide-in style, shown alongside table) ── */}
      {viewTarget && (
        <div
          className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-end p-4 backdrop-blur-sm"
          onClick={() => setViewTarget(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-xs shadow-2xl h-fit"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#D0E6F7]">
              <p className="text-[13px] font-bold text-[#0D1B2A]">
                User details
              </p>
              <button
                onClick={() => setViewTarget(null)}
                className="w-8 h-8 rounded-lg border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition cursor-pointer"
              >
                <i className="ti ti-x text-[13px]" />
              </button>
            </div>
            <div className="p-5">
              <UserDetailPanel
                user={viewTarget}
                onDelete={() => openDelete(viewTarget)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {deleteTarget && (
        <Modal title="Delete user" onClose={() => setDeleteTarget(null)}>
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <i className="ti ti-user-x text-red-500 text-[24px]" />
            </div>
            <p className="text-[15px] font-bold text-[#0D1B2A] mb-1">
              Delete {deleteTarget.name}?
            </p>
            <p className="text-[12px] text-[#7A90A4] mb-1">
              Role:{" "}
              <span className="font-semibold capitalize">
                {deleteTarget.role}
              </span>
            </p>
            <p className="text-[12px] text-[#7A90A4] mb-5 leading-relaxed">
              This will permanently remove the user and all their data. This
              cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-10 border border-[#D0E6F7] bg-[#F0F7FF] text-[#1565C0] text-[13px] font-medium rounded-[10px] cursor-pointer hover:bg-[#E1EFFE] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 h-10 bg-red-500 hover:bg-red-600 text-white text-[13px] font-bold rounded-[10px] border-none cursor-pointer disabled:opacity-60 transition"
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
