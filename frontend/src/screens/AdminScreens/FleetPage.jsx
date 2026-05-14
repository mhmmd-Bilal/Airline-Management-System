import { useState } from "react";
import { SectionTitle, Card } from "../../components/admin/shared/Card";
import { Th, Td } from "../../components/admin/shared/AdminTable";
import Badge from "../../components/admin/shared/Badge";
import {
  useGetAllAircraftQuery,
  useGetAircraftStatsQuery,
  useCreateAircraftMutation,
  useUpdateAircraftMutation,
  useDeleteAircraftMutation,
} from "../../slices/aircraftApiSlice";

const statusMap = {
  available: "Available",
  maintenance: "Maintenance",
  assigned: "Assigned",
  grounded: "Grounded",
};

const statusBadgeMap = {
  available: "Active",
  maintenance: "Maintenance",
  assigned: "Boarding",
  grounded: "Grounded",
};

const emptyForm = {
  model: "",
  registrationNumber: "",
  capacity: "",
  status: "available",
  totalFlightHours: "",
  lastMaintenanceDate: "",
  nextMaintenanceDate: "",
};

// ── Stat card ──────────────────────────────────────────
function StatCard({ label, value, icon, color }) {
  return (
    <Card>
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
      <p className="text-[26px] font-semibold text-[#0D1B2A] leading-none">
        {value}
      </p>
    </Card>
  );
}

// ── Modal ──────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D0E6F7]">
          <p className="text-[14px] font-semibold text-[#0D1B2A]">{title}</p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition"
          >
            <i className="ti ti-x text-[15px]" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Form field ─────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-[11px] font-medium uppercase tracking-[0.6px] text-[#5A7089] mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full h-[42px] px-3 text-[13px] text-[#0D1B2A] bg-[#F0F7FF] border border-[#D0E6F7] rounded-[10px] outline-none focus:border-[#1565C0] focus:shadow-[0_0_0_3px_rgba(21,101,192,0.1)] transition placeholder:text-[#B0C4D8]";

// ── AircraftForm lifted OUTSIDE FleetPage ──────────────
// This prevents remount on every keystroke (was defined inside before)
function AircraftForm({ form, formErrors, updateForm }) {
  return (
    <>
      {formErrors.api && (
        <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600">
          {formErrors.api}
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-4">
        <Field label="Aircraft Model">
          <input
            className={inputCls}
            placeholder="e.g. Airbus A320"
            value={form.model}
            onChange={(e) => updateForm("model", e.target.value)}
          />
          {formErrors.model && (
            <p className="text-[11px] text-red-500 mt-1">{formErrors.model}</p>
          )}
        </Field>
        <Field label="Registration No.">
          <input
            className={inputCls}
            placeholder="e.g. VT-ANB"
            value={form.registrationNumber}
            onChange={(e) => updateForm("registrationNumber", e.target.value)}
          />
          {formErrors.registrationNumber && (
            <p className="text-[11px] text-red-500 mt-1">
              {formErrors.registrationNumber}
            </p>
          )}
        </Field>
        <Field label="Capacity (seats)">
          <input
            type="number"
            className={inputCls}
            placeholder="e.g. 180"
            value={form.capacity}
            onChange={(e) => updateForm("capacity", e.target.value)}
          />
          {formErrors.capacity && (
            <p className="text-[11px] text-red-500 mt-1">
              {formErrors.capacity}
            </p>
          )}
        </Field>
        <Field label="Total Flight Hours">
          <input
            type="number"
            className={inputCls}
            placeholder="e.g. 4820"
            value={form.totalFlightHours}
            onChange={(e) => updateForm("totalFlightHours", e.target.value)}
          />
        </Field>
        <Field label="Last Maintenance">
          <input
            type="date"
            className={inputCls}
            value={form.lastMaintenanceDate}
            onChange={(e) => updateForm("lastMaintenanceDate", e.target.value)}
          />
        </Field>
        <Field label="Next Maintenance">
          <input
            type="date"
            className={inputCls}
            value={form.nextMaintenanceDate}
            onChange={(e) => updateForm("nextMaintenanceDate", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Status">
        <select
          className={inputCls}
          value={form.status}
          onChange={(e) => updateForm("status", e.target.value)}
        >
          <option value="available">Available</option>
          <option value="maintenance">Maintenance</option>
          <option value="assigned">Assigned</option>
          <option value="grounded">Grounded</option>
        </select>
      </Field>
    </>
  );
}

// ── Main page ──────────────────────────────────────────
export default function FleetPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  // ── API hooks ──────────────────────────────────────
  const {
    data: listData,
    isLoading: listLoading,
    isError: listError,
  } = useGetAllAircraftQuery({ status: filterStatus, search, page, limit: 10 });

  const { data: statsData, isLoading: statsLoading } =
    useGetAircraftStatsQuery();

  const [createAircraft, { isLoading: creating }] = useCreateAircraftMutation();
  const [updateAircraft, { isLoading: updating }] = useUpdateAircraftMutation();
  const [deleteAircraft, { isLoading: deleting }] = useDeleteAircraftMutation();

  // ── Derived data ───────────────────────────────────
  const fleet = listData?.data ?? []; 
  const totalCount = listData?.total ?? 0;
  const totalPages = listData?.totalPages ?? 1;
  const statsValues = statsData?.data;

  const stats = [
    {
      label: "Total Aircraft",
      value: statsLoading ? "—" : (statsValues?.total ?? "—"),
      icon: "ti-propeller",
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "Available",
      value: statsLoading ? "—" : (statsValues?.available ?? "—"),
      icon: "ti-circle-check",
      color: "bg-green-50 text-green-700",
    },
    {
      label: "In Maintenance",
      value: statsLoading ? "—" : (statsValues?.maintenance ?? "—"),
      icon: "ti-tool",
      color: "bg-orange-50 text-orange-700",
    },
    {
      label: "Grounded",
      value: statsLoading ? "—" : (statsValues?.grounded ?? "—"),
      icon: "ti-alert-triangle",
      color: "bg-red-50 text-red-700",
    },
  ];

  // ── Form helpers ───────────────────────────────────
  const updateForm = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setFormErrors((p) => ({ ...p, [k]: undefined }));
  };

  const validateForm = () => {
    const e = {};
    if (!form.model.trim()) e.model = "Model is required";
    if (!form.registrationNumber.trim())
      e.registrationNumber = "Registration number is required";
    if (!form.capacity) e.capacity = "Capacity is required";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── CRUD handlers ──────────────────────────────────
  const handleAdd = async () => {
    if (!validateForm()) return;
    try {
      await createAircraft({
        ...form,
        capacity: Number(form.capacity),
        totalFlightHours: Number(form.totalFlightHours) || 0,
        lastMaintenanceDate: form.lastMaintenanceDate || null,
        nextMaintenanceDate: form.nextMaintenanceDate || null,
      }).unwrap();
      setShowAdd(false);
      setForm(emptyForm);
      setFormErrors({});
    } catch (err) {
      setFormErrors({ api: err?.data?.message ?? "Failed to add aircraft" });
    }
  };

  const handleEdit = async () => {
    if (!validateForm()) return;
    try {
      await updateAircraft({
        id: editItem._id,
        ...form,
        capacity: Number(form.capacity),
        totalFlightHours: Number(form.totalFlightHours) || 0,
        lastMaintenanceDate: form.lastMaintenanceDate || null,
        nextMaintenanceDate: form.nextMaintenanceDate || null,
      }).unwrap();
      setEditItem(null);
      setForm(emptyForm);
      setFormErrors({});
    } catch (err) {
      setFormErrors({ api: err?.data?.message ?? "Failed to update aircraft" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteAircraft(deleteItem._id).unwrap();
      setDeleteItem(null);
    } catch (err) {
      setFormErrors({
        deleteApi: err?.data?.message ?? "Failed to delete aircraft",
      });
    }
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      model: item.model,
      registrationNumber: item.registrationNumber,
      capacity: item.capacity,
      status: item.status,
      totalFlightHours: item.totalFlightHours,
      lastMaintenanceDate: item.lastMaintenanceDate
        ? item.lastMaintenanceDate.slice(0, 10)
        : "",
      nextMaintenanceDate: item.nextMaintenanceDate
        ? item.nextMaintenanceDate.slice(0, 10)
        : "",
    });
    setFormErrors({});
  };

  // ── Render ─────────────────────────────────────────
  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-7">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Table card */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <SectionTitle>Fleet inventory</SectionTitle>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-[#B0C4D8] text-[14px]" />
              <input
                className="h-9 pl-8 pr-3 text-[12px] bg-[#F0F7FF] border border-[#D0E6F7] rounded-lg outline-none focus:border-[#1565C0] transition w-44 placeholder:text-[#B0C4D8] text-[#0D1B2A]"
                placeholder="Search aircraft..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              className="h-9 px-3 text-[12px] bg-[#F0F7FF] border border-[#D0E6F7] rounded-lg outline-none focus:border-[#1565C0] transition text-[#0D1B2A]"
              value={filterStatus}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All status</option>
              <option value="available">Available</option>
              <option value="maintenance">Maintenance</option>
              <option value="assigned">Assigned</option>
              <option value="grounded">Grounded</option>
            </select>
            <button
              onClick={() => {
                setForm(emptyForm);
                setFormErrors({});
                setShowAdd(true);
              }}
              className="h-9 px-4 bg-[#1565C0] hover:bg-[#1251A3] text-white text-[12px] font-semibold rounded-lg flex items-center gap-1.5 transition active:scale-[0.98] border-none cursor-pointer"
            >
              <i className="ti ti-plus text-[14px]" />
              Add Aircraft
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-160">
            <thead>
              <tr>
                <Th>Reg. No.</Th>
                <Th>Model</Th>
                <Th>Capacity</Th>
                <Th>Flight Hours</Th>
                <Th>Last Maintenance</Th>
                <Th>Next Maintenance</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-10 text-[13px] text-[#7A90A4]"
                  >
                    Loading...
                  </td>
                </tr>
              ) : listError ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-10 text-[13px] text-red-400"
                  >
                    Failed to load aircraft. Please try again.
                  </td>
                </tr>
              ) : fleet.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-10 text-[13px] text-[#7A90A4]"
                  >
                    No aircraft found
                  </td>
                </tr>
              ) : (
                fleet.map((f) => (
                  <tr key={f._id}>
                    <Td>
                      <span className="font-semibold text-[#1565C0]">
                        {f.registrationNumber}
                      </span>
                    </Td>
                    <Td>{f.model}</Td>
                    <Td className="text-[#7A90A4]">{f.capacity} seats</Td>
                    <Td className="text-[#7A90A4]">
                      {f.totalFlightHours.toLocaleString()} hrs
                    </Td>
                    <Td className="text-[#7A90A4]">
                      {f.lastMaintenanceDate
                        ? new Date(f.lastMaintenanceDate).toLocaleDateString(
                            "en-IN",
                            { day: "2-digit", month: "short", year: "numeric" },
                          )
                        : "—"}
                    </Td>
                    <Td className="text-[#7A90A4]">
                      {f.nextMaintenanceDate ? (
                        new Date(f.nextMaintenanceDate).toLocaleDateString(
                          "en-IN",
                          { day: "2-digit", month: "short", year: "numeric" },
                        )
                      ) : (
                        <span className="text-red-400 font-medium">
                          Not scheduled
                        </span>
                      )}
                    </Td>
                    <Td>
                      <Badge label={statusBadgeMap[f.status]} />
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setViewItem(f)}
                          className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition"
                          title="View"
                        >
                          <i className="ti ti-eye text-[13px]" />
                        </button>
                        <button
                          onClick={() => openEdit(f)}
                          className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition"
                          title="Edit"
                        >
                          <i className="ti ti-edit text-[13px]" />
                        </button>
                        <button
                          onClick={() => setDeleteItem(f)}
                          className="w-7 h-7 rounded-md border border-red-100 bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition"
                          title="Delete"
                        >
                          <i className="ti ti-trash text-[13px]" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-[11px] text-[#B0C4D8]">
            Showing {fleet.length} of {totalCount} aircraft
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <i className="ti ti-chevron-left text-[13px]" />
              </button>
              <span className="text-[12px] text-[#7A90A4] px-1">
                {page} / {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <i className="ti ti-chevron-right text-[13px]" />
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* ── Add Modal ── */}
      {showAdd && (
        <Modal title="Add new aircraft" onClose={() => setShowAdd(false)}>
          <AircraftForm
            form={form}
            formErrors={formErrors}
            updateForm={updateForm}
          />
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setShowAdd(false)}
              className="flex-1 h-10 border border-[#D0E6F7] bg-[#F0F7FF] text-[#1565C0] text-[13px] font-medium rounded-[10px] hover:bg-[#E1EFFE] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={creating}
              className="flex-1 h-10 bg-[#1565C0] hover:bg-[#1251A3] text-white text-[13px] font-semibold rounded-[10px] shadow-[0_4px_16px_rgba(21,101,192,0.25)] transition cursor-pointer border-none disabled:opacity-60"
            >
              {creating ? "Adding..." : "Add Aircraft"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Edit Modal ── */}
      {editItem && (
        <Modal
          title={`Edit — ${editItem.registrationNumber}`}
          onClose={() => setEditItem(null)}
        >
          <AircraftForm
            form={form}
            formErrors={formErrors}
            updateForm={updateForm}
          />
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setEditItem(null)}
              className="flex-1 h-10 border border-[#D0E6F7] bg-[#F0F7FF] text-[#1565C0] text-[13px] font-medium rounded-[10px] hover:bg-[#E1EFFE] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleEdit}
              disabled={updating}
              className="flex-1 h-10 bg-[#1565C0] hover:bg-[#1251A3] text-white text-[13px] font-semibold rounded-[10px] shadow-[0_4px_16px_rgba(21,101,192,0.25)] transition cursor-pointer border-none disabled:opacity-60"
            >
              {updating ? "Saving..." : "Save changes"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── View Modal ── */}
      {viewItem && (
        <Modal
          title={`Aircraft — ${viewItem.registrationNumber}`}
          onClose={() => setViewItem(null)}
        >
          <div className="flex flex-col gap-0">
            {[
              ["Model", viewItem.model],
              ["Registration No.", viewItem.registrationNumber],
              ["Capacity", `${viewItem.capacity} seats`],
              [
                "Total Flight Hours",
                `${viewItem.totalFlightHours.toLocaleString()} hrs`,
              ],
              ["Status", statusMap[viewItem.status]],
              [
                "Last Maintenance",
                viewItem.lastMaintenanceDate
                  ? new Date(viewItem.lastMaintenanceDate).toLocaleDateString(
                      "en-IN",
                      { day: "2-digit", month: "long", year: "numeric" },
                    )
                  : "—",
              ],
              [
                "Next Maintenance",
                viewItem.nextMaintenanceDate
                  ? new Date(viewItem.nextMaintenanceDate).toLocaleDateString(
                      "en-IN",
                      { day: "2-digit", month: "long", year: "numeric" },
                    )
                  : "Not scheduled",
              ],
            ].map(([label, value], i) => (
              <div
                key={label}
                className={`flex justify-between items-center py-3 ${i > 0 ? "border-t border-[#EAF4FB]" : ""}`}
              >
                <span className="text-[12px] font-medium text-[#5A7089]">
                  {label}
                </span>
                <span className="text-[12px] font-semibold text-[#0D1B2A]">
                  {value}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setViewItem(null)}
            className="mt-5 w-full h-10 bg-[#F0F7FF] border border-[#D0E6F7] text-[#1565C0] text-[13px] font-medium rounded-[10px] hover:bg-[#E1EFFE] transition cursor-pointer"
          >
            Close
          </button>
        </Modal>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteItem && (
        <Modal title="Confirm deletion" onClose={() => setDeleteItem(null)}>
          <div className="flex flex-col items-center text-center py-2">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <i className="ti ti-trash text-red-500 text-[22px]" />
            </div>
            <p className="text-[14px] font-semibold text-[#0D1B2A] mb-1">
              Delete {deleteItem.registrationNumber}?
            </p>
            <p className="text-[12px] text-[#7A90A4] mb-6">
              This will permanently remove{" "}
              <span className="font-medium text-[#0D1B2A]">
                {deleteItem.model}
              </span>{" "}
              from the fleet. This action cannot be undone.
            </p>
            {formErrors.deleteApi && (
              <div className="w-full mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600">
                {formErrors.deleteApi}
              </div>
            )}
            <div className="flex gap-3 w-full">
              <button
                onClick={() => {
                  setDeleteItem(null);
                  setFormErrors({});
                }}
                className="flex-1 h-10 border border-[#D0E6F7] bg-[#F0F7FF] text-[#1565C0] text-[13px] font-medium rounded-[10px] hover:bg-[#E1EFFE] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 h-10 bg-red-500 hover:bg-red-600 text-white text-[13px] font-semibold rounded-[10px] transition cursor-pointer border-none disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
