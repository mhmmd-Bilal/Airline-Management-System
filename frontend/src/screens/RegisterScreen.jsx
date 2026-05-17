import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRegisterUserMutation } from "../slices/userApiSlice";
import {toast} from "react-toastify"

const EmailIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    width="16"
    height="16"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M2 7l10 7 10-7" />
  </svg>
);

const EyeIcon = ({ open }) =>
  open ? (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      width="16"
      height="16"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      width="16"
      height="16"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

const CheckIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="28"
    height="28"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const UserIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    width="16"
    height="16"
  >
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const PhoneIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    width="16"
    height="16"
  >
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.68A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
  </svg>
);

const RegisterIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="16"
    height="16"
  >
    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="23" y1="11" x2="17" y2="11" />
  </svg>
);

const BrandIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="22"
    height="22"
  >
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.68A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
  </svg>
);

const perks = [
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#90CAF9"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        width="18"
        height="18"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: "Secure & private",
    desc: "Your data is encrypted and never shared.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#90CAF9"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        width="18"
        height="18"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: "Real-time access",
    desc: "Live flight status and scheduling at your fingertips.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#90CAF9"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        width="18"
        height="18"
      >
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    title: "Role-based access",
    desc: "Permissions tailored to your role automatically.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#90CAF9"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        width="18"
        height="18"
      >
        <rect x="1" y="3" width="15" height="13" rx="2" />
        <path d="M16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    title: "End-to-end ops",
    desc: "From booking to boarding, manage it all in one place.",
  },
];

export default function RegisterScreen() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const navigate = useNavigate();
  const [registerUser, { isLoading }] = useRegisterUserMutation();

  // ── Auto-redirect countdown after success ──
  useEffect(() => {
    if (!success) return;
    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate("/login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [success, navigate]);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.email.trim()) e.email = "Email address is required";
    else if (!/\S+@\S+\.\S+/.test(form.email))
      e.email = "Enter a valid email address";
    if (!form.phone.trim()) e.phone = "Phone number is required";
    else if (!/^\+?[\d\s\-]{7,15}$/.test(form.phone))
      e.phone = "Enter a valid phone number";
    if (!form.password.trim()) e.password = "Password is required";
    else if (form.password.length < 6)
      e.password = "Password must be at least 6 characters";
    if (!form.confirmPassword.trim())
      e.confirmPassword = "Please confirm your password";
    else if (form.password !== form.confirmPassword)
      e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    try {
      e.preventDefault();
      if (validate()) {
        await registerUser({ ...form }).unwrap();
        setSuccess(true);
      }
    } catch (error) {
      // console.log(error?.data?.message || error?.message);
      toast.error(error?.data?.message || error?.message)
    }
  };

  const inputClass = (hasError) =>
    [
      "w-full h-[46px] pl-[14px] pr-[42px] text-[14px] font-[400]",
      "font-jakarta rounded-[10px] border-[1.5px] outline-none",
      "transition-all duration-200 placeholder:text-[#B0C4D8]",
      hasError
        ? "bg-[#FFF5F5] border-[#E53935] text-[#0D1B2A] focus:border-[#E53935] focus:shadow-[0_0_0_3px_rgba(229,57,53,0.1)]"
        : "bg-[#F0F7FF] border-[#D0E6F7] text-[#0D1B2A] focus:bg-white focus:border-[#1565C0] focus:shadow-[0_0_0_3px_rgba(21,101,192,0.1)]",
    ].join(" ");

  const passwordStrength = (pw) => {
    if (!pw) return null;
    if (pw.length < 6) return { label: "Weak", color: "#E53935", width: "33%" };
    if (pw.length < 10 || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw))
      return { label: "Fair", color: "#FB8C00", width: "66%" };
    return { label: "Strong", color: "#2E7D32", width: "100%" };
  };

  const strength = passwordStrength(form.password);

  // ── Success screen — full-width single card, no left panel ──
  if (success) {
    return (
      <div className="min-h-screen bg-[#EAF4FB] flex items-center justify-center p-6 font-jakarta">
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap'); .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }`}</style>

        <div className="w-full max-w-md bg-white rounded-[20px] overflow-hidden shadow-[0_8px_48px_rgba(14,86,148,0.10)] px-12 py-14 flex flex-col items-center text-center">
          {/* Animated check circle */}
          <div className="w-20 h-20 rounded-full bg-[#E3F2FD] border-2 border-[#1565C0] flex items-center justify-center mb-6 text-[#1565C0]">
            <CheckIcon />
          </div>

          <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-[#1565C0] mb-2">
            Registration complete
          </p>
          <h2 className="text-[24px] font-semibold text-[#0D1B2A] leading-[1.2] mb-2">
            Account Created!
          </h2>
          <p className="text-[13px] text-[#7A90A4] mb-1">
            Welcome,{" "}
            <span className="text-[#1565C0] font-medium">{form.name}</span>.
            Your account has been created successfully.
          </p>

          {/* Countdown */}
          <p className="text-[12px] text-[#B0C4D8] mb-8">
            Redirecting to login in{" "}
            <span className="text-[#1565C0] font-semibold">{countdown}</span>{" "}
            second{countdown !== 1 ? "s" : ""}...
          </p>

          {/* Countdown progress bar */}
          <div className="w-full h-1 bg-[#E8F2FA] rounded-full overflow-hidden mb-8">
            <div
              className="h-full bg-[#1565C0] rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${((3 - countdown) / 3) * 100}%` }}
            />
          </div>

          <button
            onClick={() => navigate("/login")}
            className="w-full h-12 flex items-center justify-center gap-2 bg-[#1565C0] hover:bg-[#1251A3] active:scale-[0.99] text-white text-[14px] font-semibold rounded-[10px] shadow-[0_4px_16px_rgba(21,101,192,0.25)] hover:shadow-[0_6px_20px_rgba(21,101,192,0.35)] transition-all duration-200 border-none cursor-pointer font-jakarta"
          >
            Go to Login now
          </button>

          <p className="text-center text-[11px] text-[#B0C4D8] mt-6">
            © 2026 AirlineMS · All rights reserved
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EAF4FB] flex items-center justify-center p-6 font-jakarta">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap'); .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }`}</style>

      <div className="w-full max-w-4xl grid md:grid-cols-2 bg-white rounded-[20px] overflow-hidden shadow-[0_8px_48px_rgba(14,86,148,0.10)]">
        {/* ── LEFT PANEL ── */}
        <div className="hidden md:flex flex-col justify-between bg-[#1565C0] p-12 relative overflow-hidden">
          <div className="absolute w-[320px] h-80 rounded-full bg-white/6 -bottom-20 -right-20" />
          <div className="absolute w-45 h-45 rounded-full bg-white/5 -top-10 right-16" />

          <div className="flex items-center gap-3 relative z-10">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
              <BrandIcon />
            </div>
            <div>
              <p className="text-white text-[20px] font-semibold tracking-[-0.3px]">
                AirlineMS
              </p>
              <p className="text-white/[0.55] text-[11px] font-normal mt-0.5 tracking-[0.5px]">
                Flight Operations Platform
              </p>
            </div>
          </div>

          <div className="relative z-10">
            <h1 className="text-white text-[28px] font-semibold leading-tight mb-3">
              Everything you need,
              <br />
              from day <span className="text-[#90CAF9]">one.</span>
            </h1>
            <p className="text-white/60 text-[13px] leading-[1.7] font-light">
              Register once and get instant access to the tools that keep
              flights on time and teams in sync.
            </p>
          </div>

          <div className="relative z-10 flex flex-col gap-4">
            {perks.map((p) => (
              <div key={p.title} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  {p.icon}
                </div>
                <div>
                  <p className="text-white text-[13px] font-medium">
                    {p.title}
                  </p>
                  <p className="text-white/45 text-[11px] mt-0.5 leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex flex-col justify-center p-10 md:p-12 bg-white overflow-y-auto">
          <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-[#1565C0] mb-2">
            Get started
          </p>
          <h2 className="text-[26px] font-semibold text-[#0D1B2A] leading-[1.2] mb-1">
            Create your account
          </h2>
          <p className="text-[13px] text-[#7A90A4] font-normal mb-7">
            Fill in your details to join AirlineMS
          </p>

          {/* Name */}
          <div className="mb-4">
            <label className="block text-[11px] font-medium uppercase tracking-[0.6px] text-[#5A7089] mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="John Doe"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className={inputClass(!!errors.name)}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B0C4D8] flex items-center pointer-events-none">
                <UserIcon />
              </span>
            </div>
            {errors.name && (
              <p className="text-[11px] text-[#E53935] mt-1">{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div className="mb-4">
            <label className="block text-[11px] font-medium uppercase tracking-[0.6px] text-[#5A7089] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                placeholder="name@airline.com"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className={inputClass(!!errors.email)}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B0C4D8] flex items-center pointer-events-none">
                <EmailIcon />
              </span>
            </div>
            {errors.email && (
              <p className="text-[11px] text-[#E53935] mt-1">{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div className="mb-4">
            <label className="block text-[11px] font-medium uppercase tracking-[0.6px] text-[#5A7089] mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                className={inputClass(!!errors.phone)}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B0C4D8] flex items-center pointer-events-none">
                <PhoneIcon />
              </span>
            </div>
            {errors.phone && (
              <p className="text-[11px] text-[#E53935] mt-1">{errors.phone}</p>
            )}
          </div>

          {/* Password */}
          <div className="mb-4">
            <label className="block text-[11px] font-medium uppercase tracking-[0.6px] text-[#5A7089] mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                className={inputClass(!!errors.password)}
              />
              <button
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B0C4D8] hover:text-[#1565C0] transition-colors flex items-center bg-transparent border-none cursor-pointer p-0"
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
            {form.password.length > 0 && strength && (
              <div className="mt-2">
                <div className="w-full h-1 bg-[#E8F2FA] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: strength.width,
                      backgroundColor: strength.color,
                    }}
                  />
                </div>
                <p
                  className="text-[11px] mt-1"
                  style={{ color: strength.color }}
                >
                  {strength.label} password
                </p>
              </div>
            )}
            {errors.password && (
              <p className="text-[11px] text-[#E53935] mt-1">
                {errors.password}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="mb-7">
            <label className="block text-[11px] font-medium uppercase tracking-[0.6px] text-[#5A7089] mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
                className={inputClass(!!errors.confirmPassword)}
              />
              <button
                onClick={() => setShowConfirmPassword((p) => !p)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B0C4D8] hover:text-[#1565C0] transition-colors flex items-center bg-transparent border-none cursor-pointer p-0"
              >
                <EyeIcon open={showConfirmPassword} />
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-[11px] text-[#E53935] mt-1">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full h-12 flex items-center justify-center gap-2 bg-[#1565C0] hover:bg-[#1251A3] active:scale-[0.99] text-white text-[14px] font-semibold rounded-[10px] shadow-[0_4px_16px_rgba(21,101,192,0.25)] hover:shadow-[0_6px_20px_rgba(21,101,192,0.35)] transition-all duration-200 border-none cursor-pointer font-jakarta disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Creating Account...
              </>
            ) : (
              <>
                <RegisterIcon />
                Create Account
              </>
            )}
          </button>

          <p className="text-center text-[12px] text-[#7A90A4] mt-5">
            Already have an account?{" "}
            <button
              className="text-[#1565C0] font-medium hover:opacity-70 transition-opacity bg-transparent border-none cursor-pointer font-jakarta"
              onClick={() => navigate("/login")}
            >
              Sign in
            </button>
          </p>

          <p className="text-center text-[11px] text-[#B0C4D8] mt-3">
            © 2026 AirlineMS · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
