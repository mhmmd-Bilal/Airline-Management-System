import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLoginUserMutation } from "../slices/userApiSlice";
import { useSelector, useDispatch } from "react-redux";
import { setCredentails } from "../slices/authSlice";
import { toast } from "react-toastify";

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

const LoginIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="16"
    height="16"
  >
    <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" y1="12" x2="3" y2="12" />
  </svg>
);

const SSOIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    width="16"
    height="16"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
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

export default function LoginScreen() {
  const { userData } = useSelector((state) => state.auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [countdown, setCountdown] = useState(3);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [loginUser] = useLoginUserMutation();


  const validate = () => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = "Please enter your email address";
    if (!password.trim()) newErrors.password = "Please enter your password";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    try {
      if (validate()) {
        let data = await loginUser({ email, password }).unwrap();
        dispatch(setCredentails({ ...data }));
        toast.success(data?.message)
        navigate('/')
      }
    } catch (error) {
      console.log(error?.data?.message || error?.message);
      toast.error(error?.data?.message || error?.message)
    }
  };

  const clearError = (field) =>
    setErrors((prev) => ({ ...prev, [field]: undefined }));

  const inputClass = (hasError) =>
    [
      "w-full h-[46px] pl-[14px] pr-[42px] text-[14px] font-[400]",
      "font-jakarta rounded-[10px] border-[1.5px] outline-none",
      "transition-all duration-200 placeholder:text-[#B0C4D8]",
      hasError
        ? "bg-[#FFF5F5] border-[#E53935] text-[#0D1B2A] focus:border-[#E53935] focus:shadow-[0_0_0_3px_rgba(229,57,53,0.1)]"
        : "bg-[#F0F7FF] border-[#D0E6F7] text-[#0D1B2A] focus:bg-white focus:border-[#1565C0] focus:shadow-[0_0_0_3px_rgba(21,101,192,0.1)]",
    ].join(" ");

  // ── Success screen — full-width single card, no left panel ──
  // if (success) {
  //   return (
  //     <div className="min-h-screen bg-[#EAF4FB] flex items-center justify-center p-6 font-jakarta">
  //       <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap'); .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }`}</style>

  //       <div className="w-full max-w-md bg-white rounded-[20px] overflow-hidden shadow-[0_8px_48px_rgba(14,86,148,0.10)] px-12 py-14 flex flex-col items-center text-center">
  //         <div className="w-20 h-20 rounded-full bg-[#E3F2FD] border-2 border-[#1565C0] flex items-center justify-center mb-6 text-[#1565C0]">
  //           <CheckIcon />
  //         </div>

  //         <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-[#1565C0] mb-2">
  //           Authentication successful
  //         </p>
  //         <h2 className="text-[24px] font-semibold text-[#0D1B2A] leading-[1.2] mb-2">
  //           Login Successful
  //         </h2>
  //         <p className="text-[13px] text-[#7A90A4] mb-1">
  //           Welcome back! You have signed in successfully.
  //         </p>

  //         {/* Countdown */}
  //         <p className="text-[12px] text-[#B0C4D8] mb-8">
  //           Redirecting to dashboard in{" "}
  //           <span className="text-[#1565C0] font-semibold">{countdown}</span>{" "}
  //           second{countdown !== 1 ? "s" : ""}...
  //         </p>

  //         {/* Progress bar */}
  //         <div className="w-full h-1 bg-[#E8F2FA] rounded-full overflow-hidden mb-8">
  //           <div
  //             className="h-full bg-[#1565C0] rounded-full transition-all duration-1000 ease-linear"
  //             style={{ width: `${((3 - countdown) / 3) * 100}%` }}
  //           />
  //         </div>

  //         <button
  //           onClick={() => navigate("/")}
  //           className="w-full h-12 flex items-center justify-center gap-2 bg-[#1565C0] hover:bg-[#1251A3] active:scale-[0.99] text-white text-[14px] font-semibold rounded-[10px] shadow-[0_4px_16px_rgba(21,101,192,0.25)] hover:shadow-[0_6px_20px_rgba(21,101,192,0.35)] transition-all duration-200 border-none cursor-pointer font-jakarta"
  //         >
  //           Go to Dashboard now
  //         </button>

  //         <p className="text-center text-[11px] text-[#B0C4D8] mt-6">
  //           © 2026 AirlineMS · All rights reserved
  //         </p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen bg-[#EAF4FB] flex items-center justify-center p-6 font-jakarta">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap'); .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }`}</style>

      <div className="w-full max-w-220 grid md:grid-cols-2 bg-white rounded-[20px] overflow-hidden shadow-[0_8px_48px_rgba(14,86,148,0.10)]">
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
            <h1 className="text-white text-[30px] font-semibold leading-tight mb-3">
              Manage flights,
              <br />
              crew & ops <span className="text-[#90CAF9]">smarter.</span>
            </h1>
            <p className="text-white/60 text-[13px] leading-[1.7] font-light">
              A unified platform for scheduling, crew management, and real-time
              flight operations — all in one place.
            </p>
          </div>

          <div className="flex items-stretch relative z-10">
            {[
              ["340+", "Routes"],
              ["98.4%", "On-time"],
              ["12k", "Crew"],
            ].map(([num, label], i) => (
              <div key={label} className="flex items-stretch">
                {i > 0 && (
                  <div className="w-px bg-white/12 mx-5 self-stretch" />
                )}
                <div>
                  <p className="text-white text-[22px] font-semibold">{num}</p>
                  <p className="text-white/50 text-[10px] uppercase tracking-[0.5px] mt-0.5">
                    {label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex flex-col justify-center p-10 md:p-12 bg-white">
          <p className="text-[11px] font-medium tracking-[1.5px] uppercase text-[#1565C0] mb-2">
            Welcome back
          </p>
          <h2 className="text-[26px] font-semibold text-[#0D1B2A] leading-[1.2] mb-1">
            Sign in to AirlineMS
          </h2>
          <p className="text-[13px] text-[#7A90A4] font-normal mb-8">
            Enter your credentials to access your dashboard
          </p>

          {/* Email */}
          <div className="mb-4.5">
            <label className="block text-[11px] font-medium uppercase tracking-[0.6px] text-[#5A7089] mb-1.75">
              Email address
            </label>
            <div className="relative">
              <input
                type="email"
                placeholder="name@airline.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError("email");
                }}
                className={inputClass(!!errors.email)}
              />
              <span className="absolute right-3.25 top-1/2 -translate-y-1/2 text-[#B0C4D8] flex items-center pointer-events-none">
                <EmailIcon />
              </span>
            </div>
            {errors.email && (
              <p className="text-[11px] text-[#E53935] mt-1.25">
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="mb-1">
            <label className="block text-[11px] font-medium uppercase tracking-[0.6px] text-[#5A7089] mb-1.75">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError("password");
                }}
                className={inputClass(!!errors.password)}
              />
              <button
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3.25 top-1/2 -translate-y-1/2 text-[#B0C4D8] hover:text-[#1565C0] transition-colors flex items-center bg-transparent border-none cursor-pointer p-0"
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-[#E53935] mt-1.25">
                {errors.password}
              </p>
            )}
          </div>

          {/* Forgot */}
          <div className="flex justify-end mt-2.5 mb-5.5">
            <button className="text-[12px] text-[#1565C0] font-medium hover:opacity-70 transition-opacity bg-transparent border-none cursor-pointer font-jakarta">
              Forgot password?
            </button>
          </div>

          {/* Sign In */}
          <button
            onClick={handleSubmit}
            className="w-full h-12 flex items-center justify-center gap-2 bg-[#1565C0] hover:bg-[#1251A3] active:scale-[0.99] text-white text-[14px] font-semibold rounded-[10px] shadow-[0_4px_16px_rgba(21,101,192,0.25)] hover:shadow-[0_6px_20px_rgba(21,101,192,0.35)] transition-all duration-200 border-none cursor-pointer font-jakarta"
          >
            <LoginIcon />
            Sign In
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5.5">
            <div className="flex-1 h-px bg-[#E8F2FA]" />
            <span className="text-[11px] text-[#B0C4D8]">
              Don't Have Account?
            </span>
            <div className="flex-1 h-px bg-[#E8F2FA]" />
          </div>

          {/* Register */}
          <button
            className="w-full h-11 flex items-center justify-center gap-2 bg-[#F0F7FF] hover:bg-[#E1EFFE] border-[1.5px] border-[#D0E6F7] hover:border-[#B5D4F4] text-[#1565C0] text-[13px] font-medium rounded-[10px] transition-all duration-200 cursor-pointer font-jakarta"
            onClick={() => navigate("/register")}
          >
            <SSOIcon />
            Register
          </button>

          <p className="text-center text-[11px] text-[#B0C4D8] mt-6">
            © 2026 AirlineMS · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
