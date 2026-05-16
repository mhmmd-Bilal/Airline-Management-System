import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import UserNavbar from "../components/UserNavbar";

const destinations = [
  {
    city: "Dubai",
    country: "UAE",
    price: "₹18,500",
    tag: "Popular",
    img: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&q=80",
  },
  {
    city: "Bangkok",
    country: "Thailand",
    price: "₹12,200",
    tag: "Deal",
    img: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=400&q=80",
  },
  {
    city: "London",
    country: "UK",
    price: "₹45,000",
    tag: "Trending",
    img: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&q=80",
  },
  {
    city: "Singapore",
    country: "Singapore",
    price: "₹14,800",
    tag: "Popular",
    img: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=400&q=80",
  },
  {
    city: "Tokyo",
    country: "Japan",
    price: "₹38,000",
    tag: "Deal",
    img: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&q=80",
  },
  {
    city: "Paris",
    country: "France",
    price: "₹42,500",
    tag: "Trending",
    img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&q=80",
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
    desc: "The price you see is the price you pay. Transparent pricing always.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
      />
    ),
  },
  {
    title: "Price alerts",
    desc: "We watch fares 24/7 and notify you the moment prices drop.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    ),
  },
  {
    title: "Flexible booking",
    desc: "Change or cancel your flight without the stress or extra cost.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    ),
  },
  {
    title: "24/7 support",
    desc: "Our team is always on standby to help with any booking issue.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
      />
    ),
  },
];

export default function HomeScreen() {
  const { userData } = useSelector((state) => state.auth);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [departure, setDeparture] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);

  const swap = () => {
    const t = from;
    setFrom(to);
    setTo(t);
  };

  const navigate = useNavigate();

  // useEffect(() => {
  //   if (!userData) {
  //     navigate("/login");
  //   }
  // }, [userData]);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* ── Navbar ── */}
      <UserNavbar/>

      {/* ── Hero ── */}
      <div className="relative h-130 md:h-150 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1400&q=85"
          alt="Aerial view of clouds from airplane window"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[#0C3060]/60" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          <p
            className="text-blue-200 text-sm tracking-widest uppercase mb-3 font-medium"
            style={{ letterSpacing: "0.2em" }}
          >
            Your journey starts here
          </p>
          <h1 className="text-white text-4xl md:text-5xl font-bold leading-tight mb-4 max-w-2xl">
            Fly anywhere.
            <br />
            Pay the right price.
          </h1>
          <p className="text-blue-100 text-base md:text-lg max-w-lg">
            Compare flights from 100+ airlines. No hidden fees, no surprises.
          </p>
        </div>
      </div>

      {/* ── Search Card (overlapping hero) ── */}
      <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-10 mb-16">
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-3 mb-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                From
              </label>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" />
                </svg>
                <input
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  placeholder="City or airport"
                  className="w-full h-12 border border-slate-200 rounded-xl pl-10 pr-3 text-sm text-[#0C3060] placeholder-slate-300 outline-none focus:border-[#0C3060] focus:ring-2 focus:ring-blue-50 bg-slate-50 transition"
                />
              </div>
            </div>

            <button
              onClick={swap}
              className="hidden md:flex w-10 h-12 items-center justify-center border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition text-slate-400 hover:text-[#0C3060] shrink-0"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>

            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                To
              </label>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="City or airport"
                  className="w-full h-12 border border-slate-200 rounded-xl pl-10 pr-3 text-sm text-[#0C3060] placeholder-slate-300 outline-none focus:border-[#0C3060] focus:ring-2 focus:ring-blue-50 bg-slate-50 transition"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                Departure
              </label>
              <input
                type="date"
                value={departure}
                onChange={(e) => setDeparture(e.target.value)}
                className="w-full h-12 border border-slate-200 rounded-xl px-3 text-sm text-[#0C3060] outline-none focus:border-[#0C3060] focus:ring-2 focus:ring-blue-50 bg-slate-50 transition"
              />
            </div>
            <div className="w-full md:w-44">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                Passengers
              </label>
              <div className="flex items-center h-12 border border-slate-200 rounded-xl bg-slate-50 px-3 gap-2">
                <button
                  onClick={() => setPassengers((p) => Math.max(1, p - 1))}
                  className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:border-[#0C3060] hover:text-[#0C3060] transition font-medium text-base leading-none"
                >
                  −
                </button>
                <span className="flex-1 text-center text-sm font-semibold text-[#0C3060]">
                  {passengers} passenger{passengers > 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => setPassengers((p) => p + 1)}
                  className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:border-[#0C3060] hover:text-[#0C3060] transition font-medium text-base leading-none"
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
            className="w-full h-13 bg-[#0C3060] hover:bg-[#0a2550] active:scale-95 text-white rounded-xl text-sm font-bold tracking-wide transition flex items-center justify-center gap-2 py-3.5 cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            Search flights
          </button>
        </div>
      </div>

      {/* ── Popular Destinations ── */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p
              className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-1"
              style={{ letterSpacing: "0.18em" }}
            >
              Explore
            </p>
            <h2 className="text-2xl font-bold text-[#0C3060]">
              Popular destinations
            </h2>
          </div>
          <Link
            to={""}
            className="text-sm font-semibold text-[#185FA5] hover:text-[#0C3060] transition underline underline-offset-4"
          >
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {destinations.map((d) => (
            <div
              key={d.city}
              className="group rounded-2xl overflow-hidden border border-slate-100 hover:shadow-lg transition-all duration-300 cursor-pointer bg-white"
            >
              <div className="relative h-44 overflow-hidden">
                <img
                  src={d.img}
                  alt={d.city}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
                <span
                  className={`absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full ${tagColors[d.tag]}`}
                >
                  {d.tag}
                </span>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#0C3060]">
                    {d.city}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{d.country}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">from</p>
                  <p className="text-base font-bold text-[#0C3060]">
                    {d.price}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Airlines Strip ── */}
      <section className="bg-[#EAF2FB] border-y border-blue-100 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <p
            className="text-center text-xs font-semibold text-blue-400 uppercase tracking-widest mb-6"
            style={{ letterSpacing: "0.18em" }}
          >
            We compare flights from
          </p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {airlines.map((a) => (
              <div
                key={a.name}
                className={`flex flex-col items-center justify-center border rounded-xl py-4 px-2 text-center gap-1 ${a.color}`}
              >
                <span className="text-xl font-black">{a.code}</span>
                <span className="text-xs font-medium opacity-80 leading-tight">
                  {a.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <p
            className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-2"
            style={{ letterSpacing: "0.18em" }}
          >
            Why choose us
          </p>
          <h2 className="text-2xl font-bold text-[#0C3060]">
            Travel smarter, not harder
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex flex-col items-start gap-3 p-5 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 hover:shadow-sm transition"
            >
              <div className="w-10 h-10 bg-[#EAF2FB] border border-blue-100 rounded-xl flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-[#185FA5]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  {f.icon}
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0C3060] mb-1">
                  {f.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Banner CTA ── */}
      <section className="relative mx-4 md:mx-auto max-w-5xl rounded-3xl overflow-hidden mb-20 h-56">
        <img
          src="https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=1200&q=80"
          alt="Airport terminal"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[#0C3060]/70" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <h2 className="text-white text-2xl md:text-3xl font-bold mb-3">
            Get the best deals straight to your inbox
          </h2>
          <p className="text-blue-200 text-sm mb-6">
            Join 2 million+ travellers who never miss a fare drop.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 h-11 rounded-xl px-4 text-sm text-[#0C3060] placeholder-slate-400 outline-none border-0 focus:ring-2 focus:ring-blue-300"
            />
            <button className="h-11 bg-white text-[#0C3060] font-bold text-sm px-6 rounded-xl hover:bg-blue-50 active:scale-95 transition shrink-0">
              Subscribe
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#0C3060] text-blue-100 px-6 py-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center">
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
              <span className="text-white font-bold text-base">AirlineMS</span>
            </div>
            <p className="text-sm text-blue-300 max-w-xs">
              Your trusted platform for comparing and booking flights worldwide.
            </p>
          </div>
          <div className="flex gap-16 text-sm">
            <div className="flex flex-col gap-2">
              <p className="text-white font-semibold mb-1">Company</p>
              <a href="#" className="hover:text-white transition">
                About us
              </a>
              <a href="#" className="hover:text-white transition">
                Careers
              </a>
              <a href="#" className="hover:text-white transition">
                Press
              </a>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-white font-semibold mb-1">Support</p>
              <a href="#" className="hover:text-white transition">
                Help centre
              </a>
              <a href="#" className="hover:text-white transition">
                Contact us
              </a>
              <a href="#" className="hover:text-white transition">
                Privacy
              </a>
            </div>
          </div>
        </div>
        <div className="max-w-5xl mx-auto border-t border-white/10 mt-8 pt-6 text-xs text-blue-400 text-center">
          © 2026 AirlineMS · Flight Management System · All rights reserved
        </div>
      </footer>
    </div>
  );
}
