// src/pages/user/HomeScreen.jsx
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import UserNavbar from "../components/UserNavbar";

// ── Static data ────────────────────────────────────────
const destinations = [
  {
    city: "Dubai",
    country: "UAE",
    price: "₹18,500",
    tag: "Popular",
    img: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=80",
  },
  {
    city: "Bangkok",
    country: "Thailand",
    price: "₹12,200",
    tag: "Deal",
    img: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=600&q=80",
  },
  {
    city: "London",
    country: "UK",
    price: "₹45,000",
    tag: "Trending",
    img: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80",
  },
  {
    city: "Singapore",
    country: "Singapore",
    price: "₹14,800",
    tag: "Popular",
    img: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=600&q=80",
  },
  {
    city: "Tokyo",
    country: "Japan",
    price: "₹38,000",
    tag: "Deal",
    img: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80",
  },
  {
    city: "Paris",
    country: "France",
    price: "₹42,500",
    tag: "Trending",
    img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80",
  },
];

const airlines = [
  {
    name: "Air India",
    code: "AI",
    color: "bg-red-50 text-red-700 border-red-200",
  },
  {
    name: "IndiGo",
    code: "6E",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    name: "Emirates",
    code: "EK",
    color: "bg-sky-50 text-sky-700 border-sky-200",
  },
  {
    name: "Qatar Airways",
    code: "QR",
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    name: "Singapore Air",
    code: "SQ",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    name: "British Airways",
    code: "BA",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
];

const tagColors = {
  Popular: "bg-blue-100 text-blue-800",
  Deal: "bg-emerald-100 text-emerald-800",
  Trending: "bg-violet-100 text-violet-800",
};

const features = [
  {
    title: "No hidden fees",
    desc: "The price you see is the price you pay. Transparent pricing, always.",
    icon: "✓",
    color: "from-blue-500 to-blue-600",
  },
  {
    title: "Real-time tracking",
    desc: "Track your flight live — status, route, and current stop, all in one place.",
    icon: "📡",
    color: "from-violet-500 to-purple-600",
  },
  {
    title: "Loyalty rewards",
    desc: "Earn points every booking. Silver, Gold or Platinum — the more you fly, the more you save.",
    icon: "⭐",
    color: "from-amber-500 to-orange-500",
  },
  {
    title: "24/7 support",
    desc: "Our support team is always on standby for any booking issue.",
    icon: "🎧",
    color: "from-green-500 to-emerald-600",
  },
];

const stats = [
  { value: "500+", label: "Flights scheduled" },
  { value: "120+", label: "Routes covered" },
  { value: "50K+", label: "Happy passengers" },
  { value: "99%", label: "On-time performance" },
];

// ── Scroll hook ────────────────────────────────────────
function useScrollY() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return scrollY;
}

// ── Intersection observer hook ─────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

// ── Animated section wrapper ───────────────────────────
function FadeUp({ children, delay = 0, className = "" }) {
  const [ref, inView] = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${className}`}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(40px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── 3D tilt card ───────────────────────────────────────
function TiltCard({ children, className = "" }) {
  const ref = useRef(null);
  const frame = useRef(null);

  const onMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rotateX = ((y - cy) / cy) * -8;
    const rotateY = ((x - cx) / cx) * 8;

    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02,1.02,1.02)`;
      }
    });
  };

  const onLeave = () => {
    if (ref.current) {
      ref.current.style.transition = "transform 0.5s ease";
      ref.current.style.transform =
        "perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
      setTimeout(() => {
        if (ref.current) ref.current.style.transition = "";
      }, 500);
    }
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`will-change-transform ${className}`}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </div>
  );
}

// ── Floating plane ─────────────────────────────────────
function FloatingPlane({ scrollY }) {
  const x = Math.min(scrollY * 0.18, 75); // moves right as page scrolls
  const y = Math.sin(scrollY * 0.004) * 12; // gentle sine bob
  const r = Math.min(scrollY * 0.012, 12); // slight rotation

  return (
    <div
      className="absolute top-[22%] left-[8%] pointer-events-none z-20 select-none hidden md:block"
      style={{
        transform: `translate(${x}px, ${y}px) rotate(${r}deg)`,
        transition: "transform 0.1s linear",
      }}
    >
      <div className="relative">
        {/* Trail */}
        <div
          className="absolute top-1/2 right-full h-0.5 bg-gradient-to-l from-white/40 to-transparent"
          style={{
            width: `${Math.min(x * 1.8 + 40, 160)}px`,
            marginTop: "-1px",
          }}
        />
        <svg
          viewBox="0 0 80 32"
          className="w-20 h-8 drop-shadow-lg"
          fill="white"
        >
          {/* Fuselage */}
          <ellipse cx="38" cy="16" rx="28" ry="5" />
          {/* Nose */}
          <path d="M66 16 Q80 16 78 14 L66 14 Z" />
          <path d="M66 16 Q80 16 78 18 L66 18 Z" />
          {/* Main wing */}
          <path d="M30 14 L44 2 L50 2 L38 14 Z" opacity="0.9" />
          <path d="M30 18 L44 30 L50 30 L38 18 Z" opacity="0.9" />
          {/* Tail */}
          <path d="M12 14 L6 6 L10 6 L16 14 Z" opacity="0.8" />
          <path d="M10 16 L4 22 L8 22 L13 16 Z" opacity="0.8" />
          {/* Engine */}
          <ellipse cx="35" cy="12" rx="5" ry="2.5" opacity="0.7" />
        </svg>
      </div>
    </div>
  );
}

// ── Cloud layer ────────────────────────────────────────
function CloudLayer({ scrollY, speed, opacity, top, flip }) {
  const x = (scrollY * speed) % window.innerWidth;
  return (
    <div
      className="absolute pointer-events-none select-none"
      style={{ top, opacity, transform: `translateX(${flip ? -x : x}px)` }}
    >
      <svg viewBox="0 0 300 80" className="w-72 h-20 fill-white">
        <ellipse cx="80" cy="55" rx="70" ry="28" />
        <ellipse cx="160" cy="45" rx="90" ry="38" />
        <ellipse cx="240" cy="55" rx="70" ry="28" />
        <ellipse cx="120" cy="35" rx="55" ry="30" />
        <ellipse cx="195" cy="30" rx="50" ry="28" />
      </svg>
    </div>
  );
}

export default function HomeScreen() {
  const { userData } = useSelector((s) => s.auth);
  const navigate = useNavigate();
  const scrollY = useScrollY();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [departure, setDeparture] = useState("");
  const [passengers, setPassengers] = useState(1);

  const swap = () => {
    const t = from;
    setFrom(to);
    setTo(t);
  };

  // Hero parallax values
  const heroBgY = scrollY * 0.45;
  const heroTextY = scrollY * 0.25;
  const heroOp = Math.max(0, 1 - scrollY / 420);
  const cardY = Math.max(0, -scrollY * 0.08);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 overflow-x-hidden">
      <UserNavbar />

      {/* ════════════════════════════════════════════════ */}
      {/*  HERO                                          */}
      {/* ════════════════════════════════════════════════ */}
      <div className="relative h-[540px] md:h-[640px] overflow-hidden">
        {/* Parallax background */}
        <div
          className="absolute inset-0 scale-110"
          style={{ transform: `translateY(${heroBgY}px) scale(1.12)` }}
        >
          <img
            src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1600&q=90"
            alt="Sky view"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0C3060]/70 via-[#0C3060]/55 to-[#0C3060]/30" />
        </div>

        {/* Animated cloud layers */}
        <CloudLayer
          scrollY={scrollY}
          speed={0.04}
          opacity={0.18}
          top="8%"
          flip={false}
        />
        <CloudLayer
          scrollY={scrollY}
          speed={0.07}
          opacity={0.12}
          top="30%"
          flip={true}
        />
        <CloudLayer
          scrollY={scrollY}
          speed={0.03}
          opacity={0.1}
          top="55%"
          flip={false}
        />

        {/* Flying plane */}
        <FloatingPlane scrollY={scrollY} />

        {/* Hero text — parallax */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center"
          style={{
            transform: `translateY(${heroTextY}px)`,
            opacity: heroOp,
          }}
        >
          <div
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20 mb-5"
            style={{ transform: `translateY(${-scrollY * 0.05}px)` }}
          >
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white/90 text-[11px] font-bold tracking-[0.18em] uppercase">
              Live flight tracking · Instant booking
            </span>
          </div>

          <h1
            className="text-white text-4xl md:text-6xl font-black leading-tight mb-4 max-w-2xl"
            style={{
              transform: `translateY(${-scrollY * 0.06}px)`,
              textShadow: "0 4px 32px rgba(0,0,0,0.3)",
            }}
          >
            Fly anywhere.
            <br />
            <span className="bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
              Pay the right price.
            </span>
          </h1>

          <p
            className="text-blue-100/90 text-base md:text-lg max-w-lg leading-relaxed"
            style={{ transform: `translateY(${-scrollY * 0.04}px)` }}
          >
            Real-time flights, instant booking, loyalty rewards — all in one
            place.
          </p>
        </div>

        {/* Scroll hint */}
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
          style={{ opacity: Math.max(0, 1 - scrollY / 120) }}
        >
          <span className="text-white/50 text-[10px] font-semibold uppercase tracking-widest">
            Scroll
          </span>
          <div className="w-5 h-8 border border-white/30 rounded-full flex items-start justify-center p-1">
            <div className="w-1 h-2 bg-white/60 rounded-full animate-bounce" />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════ */}
      {/*  SEARCH CARD — sticky parallax lift             */}
      {/* ════════════════════════════════════════════════ */}
      <div
        className="max-w-4xl mx-auto px-4 -mt-20 relative z-10 mb-20"
        style={{
          transform: `translateY(${cardY}px)`,
          transition: "transform 0.1s linear",
        }}
      >
        <TiltCard className="bg-white rounded-3xl shadow-[0_32px_80px_rgba(12,48,96,0.18)] border border-blue-50 p-6 md:p-8">
          {/* Subtle inner glow */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-50/60 to-transparent pointer-events-none" />

          <div className="relative">
            <div className="flex flex-col md:flex-row gap-3 mb-3 items-end">
              {/* From */}
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  From
                </label>
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" />
                  </svg>
                  <input
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    placeholder="City or airport"
                    className="w-full h-12 border border-slate-200 rounded-2xl pl-10 pr-3 text-sm text-[#0C3060] placeholder-slate-300 outline-none focus:border-[#0C3060] focus:ring-2 focus:ring-blue-50 bg-slate-50/80 transition"
                  />
                </div>
              </div>

              {/* Swap */}
              <button
                onClick={swap}
                className="hidden md:flex w-10 h-12 items-center justify-center border border-slate-200 rounded-2xl hover:bg-blue-50 hover:border-blue-300 transition text-slate-400 hover:text-[#0C3060] shrink-0 hover:rotate-180 duration-300"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>

              {/* To */}
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  To
                </label>
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <input
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="City or airport"
                    className="w-full h-12 border border-slate-200 rounded-2xl pl-10 pr-3 text-sm text-[#0C3060] placeholder-slate-300 outline-none focus:border-[#0C3060] focus:ring-2 focus:ring-blue-50 bg-slate-50/80 transition"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 mb-6">
              {/* Date */}
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Departure
                </label>
                <input
                  type="date"
                  value={departure}
                  onChange={(e) => setDeparture(e.target.value)}
                  className="w-full h-12 border border-slate-200 rounded-2xl px-3 text-sm text-[#0C3060] outline-none focus:border-[#0C3060] focus:ring-2 focus:ring-blue-50 bg-slate-50/80 transition"
                />
              </div>

              {/* Passengers */}
              <div className="w-full md:w-48">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Passengers
                </label>
                <div className="flex items-center h-12 border border-slate-200 rounded-2xl bg-slate-50/80 px-3 gap-2">
                  <button
                    onClick={() => setPassengers((p) => Math.max(1, p - 1))}
                    className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:border-[#0C3060] hover:text-[#0C3060] transition font-bold text-base leading-none cursor-pointer"
                  >
                    −
                  </button>
                  <span className="flex-1 text-center text-sm font-bold text-[#0C3060]">
                    {passengers} passenger{passengers > 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={() => setPassengers((p) => p + 1)}
                    className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:border-[#0C3060] hover:text-[#0C3060] transition font-bold text-base leading-none cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (!from || !to || !departure) return;
                navigate(
                  `/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${departure}&passengers=${passengers}`,
                );
              }}
              className="w-full h-13 py-3.5 bg-gradient-to-r from-[#0C3060] to-[#185FA5] hover:from-[#0a2550] hover:to-[#1251A3] active:scale-[0.99] text-white rounded-2xl text-sm font-bold tracking-wide transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 cursor-pointer border-none"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              Search flights
            </button>
          </div>
        </TiltCard>
      </div>

      {/* ════════════════════════════════════════════════ */}
      {/*  STATS STRIP                                   */}
      {/* ════════════════════════════════════════════════ */}
      <FadeUp className="max-w-4xl mx-auto px-4 mb-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(({ value, label }, i) => (
            <FadeUp key={label} delay={i * 80}>
              <TiltCard className="bg-white border border-slate-100 rounded-2xl p-5 text-center hover:shadow-md transition">
                <p className="text-[28px] font-black text-[#0C3060] leading-none">
                  {value}
                </p>
                <p className="text-[11px] font-semibold text-slate-400 mt-1.5 uppercase tracking-wide">
                  {label}
                </p>
              </TiltCard>
            </FadeUp>
          ))}
        </div>
      </FadeUp>

      {/* ════════════════════════════════════════════════ */}
      {/*  POPULAR DESTINATIONS — 3D card grid           */}
      {/* ════════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 pb-24">
        <FadeUp className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[11px] font-bold text-blue-400 uppercase tracking-[0.18em] mb-1.5">
              Explore
            </p>
            <h2 className="text-3xl font-black text-[#0C3060]">
              Popular destinations
            </h2>
          </div>
          <Link
            to="/deals"
            className="text-sm font-semibold text-[#185FA5] hover:text-[#0C3060] transition underline underline-offset-4"
          >
            View all →
          </Link>
        </FadeUp>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {destinations.map((d, i) => (
            <FadeUp key={d.city} delay={i * 60}>
              <TiltCard
                className="group rounded-2xl overflow-hidden border border-slate-100 bg-white cursor-pointer"
                onClick={() =>
                  navigate(
                    `/search?from=&to=${encodeURIComponent(d.city)}&date=&passengers=1`,
                  )
                }
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={d.img}
                    alt={d.city}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                  <span
                    className={`absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full ${tagColors[d.tag]}`}
                  >
                    {d.tag}
                  </span>
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-[#0C3060]/0 group-hover:bg-[#0C3060]/20 transition-all duration-300 flex items-center justify-center">
                    <span className="text-white font-bold text-[13px] opacity-0 group-hover:opacity-100 transition-all duration-300 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/30">
                      Search flights →
                    </span>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-[#0C3060]">
                      {d.city}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{d.country}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-medium">
                      from
                    </p>
                    <p className="text-base font-black text-[#0C3060]">
                      {d.price}
                    </p>
                  </div>
                </div>
              </TiltCard>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════ */}
      {/*  PARALLAX DIVIDER — mid-page flight banner     */}
      {/* ════════════════════════════════════════════════ */}
      <div className="relative h-64 overflow-hidden mb-24">
        <div
          className="absolute inset-0 scale-110"
          style={{
            transform: `translateY(${(scrollY - 1000) * 0.3}px) scale(1.12)`,
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1556388158-158ea5ccacbd?w=1600&q=85"
            alt="Airport terminal"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0C3060]/85 via-[#0C3060]/60 to-transparent" />
        </div>
        <div
          className="absolute inset-0 flex items-center px-8 md:px-20"
          style={{ transform: `translateY(${(scrollY - 1000) * 0.1}px)` }}
        >
          <FadeUp>
            <p className="text-blue-200/80 text-[11px] font-bold uppercase tracking-[0.2em] mb-2">
              AirlineMS platform
            </p>
            <h2 className="text-white text-3xl md:text-4xl font-black mb-3 max-w-lg leading-tight">
              Manage flights.
              <br />
              Track crew. Fly smarter.
            </h2>
            <button
              onClick={() => navigate("/deals")}
              className="h-11 px-6 bg-white text-[#0C3060] text-[13px] font-black rounded-2xl hover:bg-blue-50 active:scale-95 transition border-none cursor-pointer"
            >
              Browse all flights →
            </button>
          </FadeUp>
        </div>
      </div>

      {/* ════════════════════════════════════════════════ */}
      {/*  FEATURES — 3D float cards                     */}
      {/* ════════════════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-4 pb-24">
        <FadeUp className="text-center mb-12">
          <p className="text-[11px] font-bold text-blue-400 uppercase tracking-[0.18em] mb-2">
            Why choose us
          </p>
          <h2 className="text-3xl font-black text-[#0C3060]">
            Travel smarter, not harder
          </h2>
        </FadeUp>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          {features.map(({ title, desc, icon, color }, i) => (
            <FadeUp key={title} delay={i * 80}>
              <TiltCard className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-lg transition-shadow h-full">
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-2xl mb-4 shadow-md`}
                >
                  {icon}
                </div>
                <h3 className="text-[14px] font-black text-[#0C3060] mb-2">
                  {title}
                </h3>
                <p className="text-[12px] text-slate-400 leading-relaxed">
                  {desc}
                </p>
              </TiltCard>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════ */}
      {/*  AIRLINES STRIP                                */}
      {/* ════════════════════════════════════════════════ */}
      <FadeUp>
        <section className="bg-[#EAF2FB] border-y border-blue-100 py-12 px-4 mb-0">
          <div className="max-w-5xl mx-auto">
            <p className="text-center text-[10px] font-bold text-blue-400 uppercase tracking-[0.18em] mb-6">
              Supported airlines
            </p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {airlines.map((a, i) => (
                <FadeUp key={a.name} delay={i * 50}>
                  <TiltCard
                    className={`flex flex-col items-center justify-center border rounded-2xl py-4 px-2 text-center gap-1.5 cursor-default ${a.color}`}
                  >
                    <span className="text-xl font-black">{a.code}</span>
                    <span className="text-[10px] font-semibold opacity-80 leading-tight">
                      {a.name}
                    </span>
                  </TiltCard>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>
      </FadeUp>

      {/* ════════════════════════════════════════════════ */}
      {/*  CTA BANNER                                    */}
      {/* ════════════════════════════════════════════════ */}
      <FadeUp>
        <section className="relative mx-4 md:mx-auto max-w-5xl rounded-3xl overflow-hidden my-20 h-56">
          <div
            className="absolute inset-0 scale-110"
            style={{
              transform: `translateY(${(scrollY - 2400) * 0.2}px) scale(1.12)`,
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=1200&q=80"
              alt="Airport"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-[#0C3060]/75" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <h2 className="text-white text-2xl md:text-3xl font-black mb-2">
              Get the best deals straight to your inbox
            </h2>
            <p className="text-blue-200/80 text-sm mb-6">
              Join 2M+ travellers who never miss a fare drop.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 h-11 rounded-2xl px-4 text-sm text-[#0C3060] placeholder-slate-400 outline-none border-0 focus:ring-2 focus:ring-blue-300"
              />
              <button className="h-11 bg-white text-[#0C3060] font-black text-sm px-6 rounded-2xl hover:bg-blue-50 active:scale-95 transition shrink-0 border-none cursor-pointer">
                Subscribe
              </button>
            </div>
          </div>
        </section>
      </FadeUp>

      {/* ════════════════════════════════════════════════ */}
      {/*  FOOTER                                        */}
      {/* ════════════════════════════════════════════════ */}
      <footer className="bg-[#0C3060] text-blue-100 px-6 py-12">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path d="M3 15l6-9 4 5 2-2 5 6H3z" fill="white" />
                  <path
                    d="M2 17h20"
                    stroke="white"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span className="text-white font-black text-base">AirlineMS</span>
            </div>
            <p className="text-sm text-blue-300/80 max-w-xs leading-relaxed">
              Your complete airline management platform — flights, crew,
              bookings, and loyalty in one place.
            </p>
          </div>
          <div className="flex gap-16 text-sm">
            <div className="flex flex-col gap-2">
              <p className="text-white font-bold mb-1.5">Navigate</p>
              {[
                ["Flights", "/deals"],
                ["My Bookings", "/bookings"],
                ["Loyalty", "/loyalty"],
                ["Support", "/support"],
              ].map(([l, p]) => (
                <Link
                  key={l}
                  to={p}
                  className="text-blue-300/80 hover:text-white transition"
                >
                  {l}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-white font-bold mb-1.5">Company</p>
              {["About us", "Careers", "Press", "Privacy"].map((l) => (
                <a
                  key={l}
                  href="#"
                  className="text-blue-300/80 hover:text-white transition"
                >
                  {l}
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="max-w-5xl mx-auto border-t border-white/10 mt-8 pt-6 text-[11px] text-blue-400/70 text-center">
          © 2026 AirlineMS · Flight Management System · All rights reserved
        </div>
      </footer>
    </div>
  );
}
