import { useEffect, useState } from "react";
import { SectionTitle, Card } from "../../components/admin/shared/Card";
import {
  useGetMeQuery,
  useUpdateUserMutation,
} from "../../slices/userApiSlice";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { setCredentials } from "../../slices/authSlice";

export default function SettingsPage() {
  const { data } = useGetMeQuery();

  const [updateUser, { isLoading }] = useUpdateUserMutation();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  let dispatch = useDispatch();

  useEffect(() => {
    if (data) {
      setFormData({
        name: data?.data.name || "",
        email: data?.data.email || "",
        phone: data?.data.phone || "",
        password: "",
      });
    }
  }, [data]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      };

      if (formData.password.trim()) {
        payload.password = formData.password;
      }

      const res = await updateUser({ ...payload }).unwrap();

      await dispatch(setCredentials({ ...res.data }));

      toast.success(res?.message || "Profile updated successfully");

      setFormData((prev) => ({
        ...prev,
        password: "",
      }));
    } catch (error) {
      toast.error(error?.data?.message || "Failed to update profile");
    }
  };

  return (
    <>
      <Card className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-[#EAF4FB] bg-white shadow-sm">
        {/* Header */}
        <div className="border-b border-[#EEF5FB] bg-gradient-to-r from-[#F8FBFF] to-[#F3F8FD] px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1565C0]/10 text-[#1565C0]">
              <i className="ti ti-settings text-2xl"></i>
            </div>

            <div>
              <h2 className="text-lg font-bold text-[#0D1B2A]">
                Account Settings
              </h2>

              <p className="text-sm text-[#6B7B8C]">
                Update your admin profile information
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Name */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#233648]">
              Full Name
            </label>

            <div className="relative">
              <i className="ti ti-user absolute left-4 top-1/2 -translate-y-1/2 text-[#7B8A9A]"></i>

              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter full name"
                className="h-12 w-full rounded-2xl border border-[#DCEAF7] bg-[#FAFCFE] pl-11 pr-4 text-sm outline-none transition-all focus:border-[#1565C0] focus:bg-white"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#233648]">
              Email Address
            </label>

            <div className="relative">
              <i className="ti ti-mail absolute left-4 top-1/2 -translate-y-1/2 text-[#7B8A9A]"></i>

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                className="h-12 w-full rounded-2xl border border-[#DCEAF7] bg-[#FAFCFE] pl-11 pr-4 text-sm outline-none transition-all focus:border-[#1565C0] focus:bg-white"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#233648]">
              Phone Number
            </label>

            <div className="relative">
              <i className="ti ti-phone absolute left-4 top-1/2 -translate-y-1/2 text-[#7B8A9A]"></i>

              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
                className="h-12 w-full rounded-2xl border border-[#DCEAF7] bg-[#FAFCFE] pl-11 pr-4 text-sm outline-none transition-all focus:border-[#1565C0] focus:bg-white"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#233648]">
              New Password
            </label>

            <div className="relative">
              <i className="ti ti-lock absolute left-4 top-1/2 -translate-y-1/2 text-[#7B8A9A]"></i>

              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Leave empty to keep current password"
                className="h-12 w-full rounded-2xl border border-[#DCEAF7] bg-[#FAFCFE] pl-11 pr-4 text-sm outline-none transition-all focus:border-[#1565C0] focus:bg-white"
              />
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1565C0] text-sm font-semibold text-white shadow-[0_8px_24px_rgba(21,101,192,0.25)] transition-all duration-200 hover:bg-[#1251A3] hover:shadow-[0_10px_28px_rgba(21,101,192,0.35)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <i className="ti ti-loader-2 animate-spin text-lg"></i>
                Updating...
              </>
            ) : (
              <>
                <i className="ti ti-device-floppy text-lg"></i>
                Save Changes
              </>
            )}
          </button>
        </form>
      </Card>
    </>
  );
}
