// src/pages/admin/CrewPage.jsx
import { useState, useCallback } from "react";
import { Th, Td } from "../../components/admin/shared/AdminTable";
import Badge from "../../components/admin/shared/Badge";
import Avatar from "../../components/admin/shared/Avatar";
import {
  useGetAllCrewQuery,
  useGetCrewStatsQuery,
  useCreateCrewMutation,
  useUpdateCrewMutation,
  useDeleteCrewMutation,
} from "../../slices/crewApiSlice";

const crewRoles = ["Pilot", "Co-Pilot", "Cabin Crew", "Ground Staff"];
const crewStatuses = ["Available", "On Duty", "Off Duty", "On Leave"];

const statusBadgeMap = {
  Available: "Active",
  "On Duty": "On Duty",
  "Off Duty": "Rest",
  "On Leave": "Leave",
};

const medicalBadge = {
  Fit: "Active",
  "Under Treatment": "Delayed",
};

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  employeeId: "",
  role: "Pilot",
  experience: "",
  licenseNumber: "",
  licenseExpiry: "",
  nationality: "",
  dateOfBirth: "",
  currentStatus: "Available",
  salary: "",
  medicalStatus: "Fit",
  medicalLastChecked: "",
  medicalNextDue: "",
};

const inputCls =
  "w-full h-[42px] px-3 text-[13px] text-[#0D1B2A] bg-[#F0F7FF] border border-[#D0E6F7] rounded-[10px] outline-none focus:border-[#1565C0] focus:shadow-[0_0_0_3px_rgba(21,101,192,0.1)] transition placeholder:text-[#B0C4D8]";

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

// ── Shared UI ──────────────────────────────────────────
function StatCard({ label, value, icon, color }) {
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
      <p className="text-[26px] font-semibold text-[#0D1B2A] leading-none">
        {value ?? "—"}
      </p>
    </div>
  );
}

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-2xl w-full shadow-xl max-h-[90vh] flex flex-col ${wide ? "max-w-2xl" : "max-w-lg"}`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D0E6F7] flex-shrink-0">
          <p className="text-[14px] font-semibold text-[#0D1B2A]">{title}</p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition"
          >
            <i className="ti ti-x text-[15px]" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, error, hint, children }) {
  return (
    <div className="mb-4">
      <label className="block text-[11px] font-medium uppercase tracking-[0.6px] text-[#5A7089] mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-[#B0C4D8] mt-1">{hint}</p>}
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function StepIndicator({ step }) {
  const steps = [
    { n: 1, label: "Account details" },
    { n: 2, label: "Professional profile" },
  ];
  return (
    <div className="flex items-center mb-6">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center flex-1">
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-all
              ${step >= s.n ? "bg-[#1565C0] text-white" : "bg-[#EAF4FB] text-[#B0C4D8]"}`}
            >
              {step > s.n ? <i className="ti ti-check text-[11px]" /> : s.n}
            </div>
            <span
              className={`text-[11px] font-medium whitespace-nowrap ${step >= s.n ? "text-[#1565C0]" : "text-[#B0C4D8]"}`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`flex-1 h-px mx-3 ${step > s.n ? "bg-[#1565C0]" : "bg-[#D0E6F7]"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Forms defined OUTSIDE to prevent focus loss ────────
function Step1Form({ form, formErrors, updateForm, isEdit }) {
  return (
    <>
      {formErrors.api && (
        <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600">
          {formErrors.api}
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-4">
        <Field label="Full Name" error={formErrors.name}>
          <input
            className={inputCls}
            placeholder="e.g. Capt. Arjun Mehta"
            value={form.name}
            onChange={(e) => updateForm("name", e.target.value)}
          />
        </Field>
        <Field label="Phone" error={formErrors.phone}>
          <input
            className={inputCls}
            placeholder="e.g. 9876543210"
            value={form.phone}
            onChange={(e) => updateForm("phone", e.target.value)}
          />
        </Field>
        <Field label="Email" error={formErrors.email}>
          <input
            type="email"
            className={inputCls}
            placeholder="e.g. arjun@airline.com"
            value={form.email}
            onChange={(e) => updateForm("email", e.target.value)}
          />
        </Field>
        <Field
          label={isEdit ? "New Password (optional)" : "Password"}
          error={formErrors.password}
        >
          <input
            type="password"
            className={inputCls}
            placeholder={
              isEdit ? "Leave blank to keep current" : "Min. 6 characters"
            }
            value={form.password}
            onChange={(e) => updateForm("password", e.target.value)}
          />
        </Field>
      </div>
    </>
  );
}

function Step2Form({ form, formErrors, updateForm }) {
  return (
    <div className="grid grid-cols-2 gap-x-4">
      <Field label="Employee ID" error={formErrors.employeeId}>
        <input
          className={inputCls}
          placeholder="e.g. EMP-001"
          value={form.employeeId}
          onChange={(e) => updateForm("employeeId", e.target.value)}
        />
      </Field>
      <Field label="Role" error={formErrors.role}>
        <select
          className={inputCls}
          value={form.role}
          onChange={(e) => updateForm("role", e.target.value)}
        >
          {crewRoles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Experience (years)">
        <input
          type="number"
          className={inputCls}
          placeholder="e.g. 8"
          value={form.experience}
          onChange={(e) => updateForm("experience", e.target.value)}
        />
      </Field>
      <Field label="Nationality">
        <input
          className={inputCls}
          placeholder="e.g. Indian"
          value={form.nationality}
          onChange={(e) => updateForm("nationality", e.target.value)}
        />
      </Field>
      <Field label="Date of Birth">
        <input
          type="date"
          className={inputCls}
          value={form.dateOfBirth}
          onChange={(e) => updateForm("dateOfBirth", e.target.value)}
        />
      </Field>
      <Field label="Salary (₹)">
        <input
          type="number"
          className={inputCls}
          placeholder="e.g. 280000"
          value={form.salary}
          onChange={(e) => updateForm("salary", e.target.value)}
        />
      </Field>
      <Field label="License Number" hint="Leave blank for non-pilot roles">
        <input
          className={inputCls}
          placeholder="e.g. DGCA-PIL-1234"
          value={form.licenseNumber}
          onChange={(e) => updateForm("licenseNumber", e.target.value)}
        />
      </Field>
      <Field label="License Expiry">
        <input
          type="date"
          className={inputCls}
          value={form.licenseExpiry}
          onChange={(e) => updateForm("licenseExpiry", e.target.value)}
        />
      </Field>
      <Field label="Current Status">
        <select
          className={inputCls}
          value={form.currentStatus}
          onChange={(e) => updateForm("currentStatus", e.target.value)}
        >
          {crewStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Medical Status">
        <select
          className={inputCls}
          value={form.medicalStatus}
          onChange={(e) => updateForm("medicalStatus", e.target.value)}
        >
          <option value="Fit">Fit</option>
          <option value="Under Treatment">Under Treatment</option>
        </select>
      </Field>
      <Field label="Medical Last Checked">
        <input
          type="date"
          className={inputCls}
          value={form.medicalLastChecked}
          onChange={(e) => updateForm("medicalLastChecked", e.target.value)}
        />
      </Field>
      <Field label="Medical Next Due">
        <input
          type="date"
          className={inputCls}
          value={form.medicalNextDue}
          onChange={(e) => updateForm("medicalNextDue", e.target.value)}
        />
      </Field>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────
export default function CrewPage() {
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [addStep, setAddStep] = useState(1);
  const [editItem, setEditItem] = useState(null);
  const [editStep, setEditStep] = useState(1);
  const [deleteItem, setDeleteItem] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  // ── API hooks ──────────────────────────────────────
  const {
    data: listData,
    isLoading: listLoading,
    isError: listError,
  } = useGetAllCrewQuery({
    role: filterRole,
    currentStatus: filterStatus,
    search,
    page,
    limit: 10,
  });

  const { data: statsData, isLoading: statsLoading } = useGetCrewStatsQuery();

  const [createCrew, { isLoading: creating }] = useCreateCrewMutation();
  const [updateCrew, { isLoading: updating }] = useUpdateCrewMutation();
  const [deleteCrew, { isLoading: deleting }] = useDeleteCrewMutation();

  // ── Derived data ───────────────────────────────────
  const crewList = listData?.data ?? [];
  const totalCount = listData?.total ?? 0;
  const totalPages = listData?.totalPages ?? 1;
  const sv = statsData?.data;

  const stats = [
    {
      label: "Total Crew",
      value: statsLoading ? "—" : sv?.total,
      icon: "ti-users",
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "On Duty",
      value: statsLoading ? "—" : sv?.status?.onDuty,
      icon: "ti-circle-check",
      color: "bg-green-50 text-green-700",
    },
    {
      label: "Available",
      value: statsLoading ? "—" : sv?.status?.available,
      icon: "ti-user-check",
      color: "bg-violet-50 text-violet-700",
    },
    {
      label: "On Leave",
      value: statsLoading ? "—" : sv?.status?.onLeave,
      icon: "ti-beach",
      color: "bg-orange-50 text-orange-700",
    },
  ];

  // ── Form helpers ───────────────────────────────────
  const updateForm = useCallback((k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setFormErrors((p) => ({ ...p, [k]: undefined }));
  }, []);

  const validateStep1 = (isEdit = false) => {
    const e = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.phone.trim()) e.phone = "Phone number is required";
    if (!isEdit && !form.password.trim()) e.password = "Password is required";
    if (!isEdit && form.password && form.password.length < 6)
      e.password = "Min. 6 characters";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.employeeId.trim()) e.employeeId = "Employee ID is required";
    if (!form.role) e.role = "Role is required";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = () => ({
    name: form.name,
    email: form.email,
    phone: form.phone,
    ...(form.password ? { password: form.password } : {}),
    employeeId: form.employeeId,
    role: form.role,
    experience: Number(form.experience) || 0,
    licenseNumber: form.licenseNumber || null,
    licenseExpiry: form.licenseExpiry || null,
    nationality: form.nationality || null,
    dateOfBirth: form.dateOfBirth || null,
    currentStatus: form.currentStatus,
    salary: form.salary ? Number(form.salary) : null,
    medicalStatus: form.medicalStatus,
    medicalLastChecked: form.medicalLastChecked || null,
    medicalNextDue: form.medicalNextDue || null,
  });

  // ── CRUD handlers ──────────────────────────────────
  const handleAdd = async () => {
    if (!validateStep2()) return;
    try {
      await createCrew(buildPayload()).unwrap();
      setShowAdd(false);
      setAddStep(1);
      setForm(emptyForm);
      setFormErrors({});
    } catch (err) {
      setFormErrors({ api: err?.data?.message ?? "Failed to add crew member" });
    }
  };

  const handleEdit = async () => {
    if (!validateStep2()) return;
    try {
      await updateCrew({ id: editItem._id, ...buildPayload() }).unwrap();
      setEditItem(null);
      setEditStep(1);
      setForm(emptyForm);
      setFormErrors({});
    } catch (err) {
      setFormErrors({
        api: err?.data?.message ?? "Failed to update crew member",
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCrew(deleteItem._id).unwrap();
      setDeleteItem(null);
    } catch (err) {
      setFormErrors({
        deleteApi: err?.data?.message ?? "Failed to delete crew member",
      });
    }
  };

  const openEdit = (item) => {
    setEditItem(item);
    setEditStep(1);
    // item.userId holds the populated user object
    const u = item.userId ?? {};
    setForm({
      name: u.name ?? item.name ?? "",
      email: u.email ?? item.email ?? "",
      phone: u.phone ?? item.phone ?? "",
      password: "",
      employeeId: item.employeeId ?? "",
      role: item.role ?? "Pilot",
      experience: item.experience ?? "",
      licenseNumber: item.licenseNumber ?? "",
      licenseExpiry: fmtInput(item.licenseExpiry),
      nationality: item.nationality ?? "",
      dateOfBirth: fmtInput(item.dateOfBirth),
      currentStatus: item.currentStatus ?? "Available",
      salary: item.salary ?? "",
      medicalStatus: item.medicalStatus ?? "Fit",
      medicalLastChecked: fmtInput(item.medicalLastChecked),
      medicalNextDue: fmtInput(item.medicalNextDue),
    });
    setFormErrors({});
  };

  const goNextAdd = () => {
    if (!validateStep1(false)) return;
    setAddStep(2);
    setFormErrors({});
  };

  const goNextEdit = () => {
    if (!validateStep1(true)) return;
    setEditStep(2);
    setFormErrors({});
  };

  // helper to resolve name/email/phone from populated or flat object
  const resolveName = (c) => c.userId?.name ?? c.name ?? "—";
  const resolveEmail = (c) => c.userId?.email ?? c.email ?? "—";
  const resolvePhone = (c) => c.userId?.phone ?? c.phone ?? "—";

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-7">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#D0E6F7] rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <p className="text-[11px] font-semibold text-[#5A7089] uppercase tracking-[0.8px]">
            Crew members
          </p>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-[#B0C4D8] text-[14px]" />
              <input
                className="h-9 pl-8 pr-3 text-[12px] bg-[#F0F7FF] border border-[#D0E6F7] rounded-lg outline-none focus:border-[#1565C0] transition w-44 placeholder:text-[#B0C4D8] text-[#0D1B2A]"
                placeholder="Search crew..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              className="h-9 px-3 text-[12px] bg-[#F0F7FF] border border-[#D0E6F7] rounded-lg outline-none focus:border-[#1565C0] transition text-[#0D1B2A]"
              value={filterRole}
              onChange={(e) => {
                setFilterRole(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All roles</option>
              {crewRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select
              className="h-9 px-3 text-[12px] bg-[#F0F7FF] border border-[#D0E6F7] rounded-lg outline-none focus:border-[#1565C0] transition text-[#0D1B2A]"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All status</option>
              {crewStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setForm(emptyForm);
                setFormErrors({});
                setAddStep(1);
                setShowAdd(true);
              }}
              className="h-9 px-4 bg-[#1565C0] hover:bg-[#1251A3] text-white text-[12px] font-semibold rounded-lg flex items-center gap-1.5 transition active:scale-[0.98] border-none cursor-pointer"
            >
              <i className="ti ti-plus text-[14px]" />
              Add Crew
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr>
                <Th>Member</Th>
                <Th>Role</Th>
                <Th>Employee ID</Th>
                <Th>Experience</Th>
                <Th>Medical</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-10 text-[13px] text-[#7A90A4]"
                  >
                    Loading...
                  </td>
                </tr>
              ) : listError ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-10 text-[13px] text-red-400"
                  >
                    Failed to load crew. Please try again.
                  </td>
                </tr>
              ) : crewList.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-10 text-[13px] text-[#7A90A4]"
                  >
                    No crew members found
                  </td>
                </tr>
              ) : (
                crewList.map((c) => (
                  <tr key={c._id}>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={resolveName(c)} size="sm" />
                        <div>
                          <p className="font-semibold text-[#0D1B2A] text-[12px]">
                            {resolveName(c)}
                          </p>
                          <p className="text-[10px] text-[#7A90A4]">
                            {resolveEmail(c)}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-[#7A90A4]">{c.role}</Td>
                    <Td className="text-[#7A90A4]">{c.employeeId}</Td>
                    <Td className="text-[#7A90A4]">
                      {c.experience} yr{c.experience !== 1 ? "s" : ""}
                    </Td>
                    <Td>
                      <Badge
                        label={medicalBadge[c.medicalStatus] || c.medicalStatus}
                      />
                    </Td>
                    <Td>
                      <Badge
                        label={
                          statusBadgeMap[c.currentStatus] || c.currentStatus
                        }
                      />
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setViewItem(c)}
                          className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition"
                          title="View"
                        >
                          <i className="ti ti-eye text-[13px]" />
                        </button>
                        <button
                          onClick={() => openEdit(c)}
                          className="w-7 h-7 rounded-md border border-[#D0E6F7] bg-[#F0F7FF] flex items-center justify-center text-[#1565C0] hover:bg-[#E1EFFE] transition"
                          title="Edit"
                        >
                          <i className="ti ti-edit text-[13px]" />
                        </button>
                        <button
                          onClick={() => setDeleteItem(c)}
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
            Showing {crewList.length} of {totalCount} crew members
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
      </div>

      {/* ── Add Modal (2-step) ── */}
      {showAdd && (
        <Modal
          title="Add crew member"
          wide
          onClose={() => {
            setShowAdd(false);
            setAddStep(1);
          }}
        >
          <StepIndicator step={addStep} />
          {addStep === 1 ? (
            <>
              <Step1Form
                form={form}
                formErrors={formErrors}
                updateForm={updateForm}
                isEdit={false}
              />
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setShowAdd(false)}
                  className="flex-1 h-10 border border-[#D0E6F7] bg-[#F0F7FF] text-[#1565C0] text-[13px] font-medium rounded-[10px] hover:bg-[#E1EFFE] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={goNextAdd}
                  className="flex-1 h-10 bg-[#1565C0] hover:bg-[#1251A3] text-white text-[13px] font-semibold rounded-[10px] shadow-[0_4px_16px_rgba(21,101,192,0.25)] transition cursor-pointer border-none flex items-center justify-center gap-2"
                >
                  Next <i className="ti ti-arrow-right text-[14px]" />
                </button>
              </div>
            </>
          ) : (
            <>
              {formErrors.api && (
                <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600">
                  {formErrors.api}
                </div>
              )}
              <Step2Form
                form={form}
                formErrors={formErrors}
                updateForm={updateForm}
              />
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => {
                    setAddStep(1);
                    setFormErrors({});
                  }}
                  className="flex-1 h-10 border border-[#D0E6F7] bg-[#F0F7FF] text-[#1565C0] text-[13px] font-medium rounded-[10px] hover:bg-[#E1EFFE] transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <i className="ti ti-arrow-left text-[14px]" /> Back
                </button>
                <button
                  onClick={handleAdd}
                  disabled={creating}
                  className="flex-1 h-10 bg-[#1565C0] hover:bg-[#1251A3] text-white text-[13px] font-semibold rounded-[10px] shadow-[0_4px_16px_rgba(21,101,192,0.25)] transition cursor-pointer border-none disabled:opacity-60"
                >
                  {creating ? "Adding..." : "Add Member"}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* ── Edit Modal (2-step) ── */}
      {editItem && (
        <Modal
          title={`Edit — ${resolveName(editItem)}`}
          wide
          onClose={() => {
            setEditItem(null);
            setEditStep(1);
          }}
        >
          <StepIndicator step={editStep} />
          {editStep === 1 ? (
            <>
              <Step1Form
                form={form}
                formErrors={formErrors}
                updateForm={updateForm}
                isEdit={true}
              />
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => {
                    setEditItem(null);
                    setEditStep(1);
                  }}
                  className="flex-1 h-10 border border-[#D0E6F7] bg-[#F0F7FF] text-[#1565C0] text-[13px] font-medium rounded-[10px] hover:bg-[#E1EFFE] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={goNextEdit}
                  className="flex-1 h-10 bg-[#1565C0] hover:bg-[#1251A3] text-white text-[13px] font-semibold rounded-[10px] shadow-[0_4px_16px_rgba(21,101,192,0.25)] transition cursor-pointer border-none flex items-center justify-center gap-2"
                >
                  Next <i className="ti ti-arrow-right text-[14px]" />
                </button>
              </div>
            </>
          ) : (
            <>
              {formErrors.api && (
                <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600">
                  {formErrors.api}
                </div>
              )}
              <Step2Form
                form={form}
                formErrors={formErrors}
                updateForm={updateForm}
              />
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => {
                    setEditStep(1);
                    setFormErrors({});
                  }}
                  className="flex-1 h-10 border border-[#D0E6F7] bg-[#F0F7FF] text-[#1565C0] text-[13px] font-medium rounded-[10px] hover:bg-[#E1EFFE] transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <i className="ti ti-arrow-left text-[14px]" /> Back
                </button>
                <button
                  onClick={handleEdit}
                  disabled={updating}
                  className="flex-1 h-10 bg-[#1565C0] hover:bg-[#1251A3] text-white text-[13px] font-semibold rounded-[10px] shadow-[0_4px_16px_rgba(21,101,192,0.25)] transition cursor-pointer border-none disabled:opacity-60"
                >
                  {updating ? "Saving..." : "Save changes"}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* ── View Modal ── */}
      {viewItem && (
        <Modal
          title={`Crew profile — ${resolveName(viewItem)}`}
          wide
          onClose={() => setViewItem(null)}
        >
          <div className="flex items-center gap-4 pb-4 mb-4 border-b border-[#EAF4FB]">
            <Avatar name={resolveName(viewItem)} size="lg" />
            <div>
              <p className="text-[15px] font-semibold text-[#0D1B2A]">
                {resolveName(viewItem)}
              </p>
              <p className="text-[12px] text-[#7A90A4] mt-0.5">
                {viewItem.role} · {viewItem.employeeId}
              </p>
              <div className="flex gap-2 mt-1.5">
                <Badge
                  label={
                    statusBadgeMap[viewItem.currentStatus] ||
                    viewItem.currentStatus
                  }
                />
                <Badge
                  label={
                    medicalBadge[viewItem.medicalStatus] ||
                    viewItem.medicalStatus
                  }
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8">
            <div>
              <p className="text-[10px] font-semibold text-[#1565C0] uppercase tracking-widest mb-3">
                Account
              </p>
              {[
                ["Email", resolveEmail(viewItem)],
                ["Phone", resolvePhone(viewItem)],
                ["Nationality", viewItem.nationality || "—"],
                ["Date of Birth", fmtDate(viewItem.dateOfBirth)],
              ].map(([l, v], i) => (
                <div
                  key={l}
                  className={`flex justify-between items-center py-2 ${i > 0 ? "border-t border-[#EAF4FB]" : ""}`}
                >
                  <span className="text-[11px] font-medium text-[#5A7089]">
                    {l}
                  </span>
                  <span className="text-[11px] font-semibold text-[#0D1B2A] text-right max-w-[55%] truncate">
                    {v}
                  </span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#1565C0] uppercase tracking-widest mb-3">
                Professional
              </p>
              {[
                ["Experience", `${viewItem.experience} years`],
                [
                  "Salary",
                  viewItem.salary
                    ? `₹${Number(viewItem.salary).toLocaleString()}`
                    : "—",
                ],
                ["License No.", viewItem.licenseNumber || "—"],
                ["License Expiry", fmtDate(viewItem.licenseExpiry)],
              ].map(([l, v], i) => (
                <div
                  key={l}
                  className={`flex justify-between items-center py-2 ${i > 0 ? "border-t border-[#EAF4FB]" : ""}`}
                >
                  <span className="text-[11px] font-medium text-[#5A7089]">
                    {l}
                  </span>
                  <span className="text-[11px] font-semibold text-[#0D1B2A] text-right max-w-[55%] truncate">
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[#EAF4FB]">
            <p className="text-[10px] font-semibold text-[#1565C0] uppercase tracking-widest mb-3">
              Medical
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Status", viewItem.medicalStatus],
                ["Last Checked", fmtDate(viewItem.medicalLastChecked)],
                ["Next Due", fmtDate(viewItem.medicalNextDue)],
              ].map(([l, v]) => (
                <div key={l} className="bg-[#F7FAFD] rounded-xl p-3">
                  <p className="text-[10px] text-[#7A90A4] mb-1">{l}</p>
                  <p className="text-[12px] font-semibold text-[#0D1B2A]">
                    {v}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setViewItem(null)}
            className="mt-5 w-full h-10 bg-[#F0F7FF] border border-[#D0E6F7] text-[#1565C0] text-[13px] font-medium rounded-[10px] hover:bg-[#E1EFFE] transition cursor-pointer"
          >
            Close
          </button>
        </Modal>
      )}

      {/* ── Delete Modal ── */}
      {deleteItem && (
        <Modal title="Confirm deletion" onClose={() => setDeleteItem(null)}>
          <div className="flex flex-col items-center text-center py-2">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <i className="ti ti-user-off text-red-500 text-[22px]" />
            </div>
            <p className="text-[14px] font-semibold text-[#0D1B2A] mb-1">
              Remove {resolveName(deleteItem)}?
            </p>
            <p className="text-[12px] text-[#7A90A4] mb-6">
              This will permanently remove{" "}
              <span className="font-medium text-[#0D1B2A]">
                {resolveName(deleteItem)}
              </span>{" "}
              ({deleteItem.role}) from the crew roster and delete their user
              account. This cannot be undone.
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
                {deleting ? "Removing..." : "Yes, remove"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
