// services/pdfService.js
import puppeteer from "puppeteer";
import { generateQR } from "../utils/qrHelper.js";

/* -------------------------------------------------------------------------- */
/*                              SHARED HELPERS                                */
/* -------------------------------------------------------------------------- */

const fmt = (dt) =>
  dt
    ? new Date(dt).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
      })
    : "—";

const fmtDate = (dt) =>
  dt
    ? new Date(dt).toLocaleDateString("en-IN", {
        day: "2-digit", month: "long", year: "numeric",
      })
    : "—";

const fmtTime = (dt) =>
  dt
    ? new Date(dt).toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit", hour12: true,
      })
    : "—";

const CLASS_LABEL = { economy: "Economy", business: "Business Class", first: "First Class" };

/**
 * Launches a puppeteer browser, renders HTML, exports as PDF buffer.
 * Reuse browser across multiple renders by passing it in.
 */
async function htmlToPdf(html, browser) {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const buffer = await page.pdf({
    format:          "A4",
    printBackground: true,
    margin:          { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
  });
  await page.close();
  return buffer;
}

/* -------------------------------------------------------------------------- */
/*                         BOARDING PASS TEMPLATE                             */
/* -------------------------------------------------------------------------- */
/*
 * One boarding pass per passenger.
 * Returns an array of PDF Buffers.
 */
async function buildBoardingPassHtml(passenger, seat, index, booking, flight, qrDataUri) {
  const seatClass = CLASS_LABEL[booking.seatClass] || booking.seatClass;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    background: #f0f4f8;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 40px;
  }
  .card {
    background: white;
    border-radius: 20px;
    overflow: hidden;
    width: 680px;
    box-shadow: 0 20px 60px rgba(12,48,96,0.15);
    display: flex;
    flex-direction: column;
  }
  /* ── Header ── */
  .header {
    background: linear-gradient(135deg, #0C3060 0%, #1a5fa8 100%);
    color: white;
    padding: 28px 36px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .header-logo { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
  .header-sub  { font-size: 11px; opacity: 0.7; margin-top: 2px; letter-spacing: 1px; text-transform: uppercase; }
  .header-ref  {
    background: rgba(255,255,255,0.15);
    border-radius: 10px;
    padding: 10px 18px;
    text-align: right;
  }
  .header-ref-label { font-size: 9px; opacity: 0.7; letter-spacing: 1px; text-transform: uppercase; }
  .header-ref-value { font-size: 18px; font-weight: 700; letter-spacing: 2px; margin-top: 2px; }
  /* ── Route bar ── */
  .route {
    background: #EAF2FB;
    padding: 24px 36px;
    display: flex;
    align-items: center;
    gap: 0;
  }
  .route-city { flex: 1; }
  .route-city-code { font-size: 48px; font-weight: 800; color: #0C3060; line-height: 1; }
  .route-city-name { font-size: 12px; color: #7a90a4; margin-top: 4px; }
  .route-middle {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .route-flight { font-size: 12px; font-weight: 700; color: #0C3060; letter-spacing: 1px; }
  .route-line {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
    justify-content: center;
  }
  .route-dot { width: 6px; height: 6px; border-radius: 50%; background: #0C3060; }
  .route-dash { flex: 1; height: 1px; background: #b0c4d8; max-width: 60px; }
  .route-plane { font-size: 20px; }
  .route-class { font-size: 10px; color: #7a90a4; letter-spacing: 0.5px; }
  .route-city.right { text-align: right; }
  /* ── Main body ── */
  .body { display: flex; }
  .body-main {
    flex: 1;
    padding: 28px 36px;
    border-right: 2px dashed #e0ecf8;
  }
  .body-stub {
    width: 180px;
    padding: 28px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  /* Info grid */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 20px; }
  .info-item-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #7a90a4; margin-bottom: 4px; }
  .info-item-value { font-size: 15px; font-weight: 700; color: #0C3060; }
  .info-item-sub   { font-size: 10px; color: #a0b4c8; margin-top: 2px; }
  /* Passenger name */
  .passenger-name {
    font-size: 22px;
    font-weight: 800;
    color: #0C3060;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .passenger-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #7a90a4; margin-bottom: 16px; }
  /* Stub */
  .stub-seat-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #7a90a4; }
  .stub-seat-value { font-size: 40px; font-weight: 800; color: #0C3060; }
  .stub-divider { width: 100%; height: 1px; background: #e0ecf8; }
  .stub-qr img { width: 110px; height: 110px; }
  .stub-ref { font-size: 9px; color: #a0b4c8; text-align: center; word-break: break-all; }
  /* Footer */
  .footer {
    background: #f8fbff;
    padding: 14px 36px;
    font-size: 10px;
    color: #a0b4c8;
    border-top: 1px solid #e8f0f8;
    text-align: center;
    letter-spacing: 0.3px;
  }
  .badge {
    display: inline-block;
    background: #0C3060;
    color: white;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1px;
    padding: 3px 10px;
    border-radius: 20px;
    text-transform: uppercase;
    margin-bottom: 10px;
  }
</style>
</head>
<body>
<div class="card">
  <!-- Header -->
  <div class="header">
    <div>
      <div class="header-logo">✈ AirlineMS</div>
      <div class="header-sub">Boarding Pass · Passenger ${index + 1}</div>
    </div>
    <div class="header-ref">
      <div class="header-ref-label">Booking Ref</div>
      <div class="header-ref-value">${booking.bookingReference}</div>
    </div>
  </div>

  <!-- Route -->
  <div class="route">
    <div class="route-city">
      <div class="route-city-code">${flight.source}</div>
      <div class="route-city-name">${fmtTime(flight.departureTime)}</div>
    </div>
    <div class="route-middle">
      <div class="route-flight">${flight.flightNumber}</div>
      <div class="route-line">
        <div class="route-dot"></div>
        <div class="route-dash"></div>
        <div class="route-plane">✈</div>
        <div class="route-dash"></div>
        <div class="route-dot"></div>
      </div>
      <div class="route-class">${seatClass}</div>
    </div>
    <div class="route-city right">
      <div class="route-city-code">${flight.destination}</div>
      <div class="route-city-name">${fmtTime(flight.arrivalTime)}</div>
    </div>
  </div>

  <!-- Body -->
  <div class="body">
    <div class="body-main">
      <div class="badge">Boarding Pass</div>
      <div class="passenger-name">${passenger.name}</div>
      <div class="passenger-label">Passenger Name</div>

      <div class="info-grid">
        <div>
          <div class="info-item-label">Date</div>
          <div class="info-item-value">${fmtDate(flight.departureTime)}</div>
        </div>
        <div>
          <div class="info-item-label">Departs</div>
          <div class="info-item-value">${fmtTime(flight.departureTime)}</div>
          <div class="info-item-sub">On time</div>
        </div>
        <div>
          <div class="info-item-label">Arrives</div>
          <div class="info-item-value">${fmtTime(flight.arrivalTime)}</div>
        </div>
        <div>
          <div class="info-item-label">Class</div>
          <div class="info-item-value">${seatClass}</div>
        </div>
        <div>
          <div class="info-item-label">Age</div>
          <div class="info-item-value">${passenger.age}</div>
        </div>
        <div>
          <div class="info-item-label">Gender</div>
          <div class="info-item-value" style="text-transform:capitalize">${passenger.gender}</div>
        </div>
      </div>
    </div>

    <!-- Stub -->
    <div class="body-stub">
      <div>
        <div class="stub-seat-label">Seat</div>
        <div class="stub-seat-value">${seat}</div>
      </div>
      <div class="stub-divider"></div>
      <div class="stub-qr">
        <img src="${qrDataUri}" alt="QR Code"/>
      </div>
      <div class="stub-ref">${booking.bookingReference}</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    Please arrive at the gate 45 minutes before departure · This boarding pass is valid only for the named passenger · AirlineMS
  </div>
</div>
</body>
</html>`;
}

/* -------------------------------------------------------------------------- */
/*                           E-TICKET TEMPLATE                                */
/* -------------------------------------------------------------------------- */

async function buildTicketHtml(booking, flight, qrDataUri) {
  const seatClass  = CLASS_LABEL[booking.seatClass] || booking.seatClass;
  const stops      = flight.routes?.length > 2 ? `${flight.routes.length - 2} Stop(s)` : "Non-stop";
  const duration   = Math.round(
    (new Date(flight.arrivalTime) - new Date(flight.departureTime)) / 60000
  );
  const durationStr = `${Math.floor(duration / 60)}h ${duration % 60}m`;

  const passengersRows = booking.passengers
    .map(
      (p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td style="font-weight:600;color:#0C3060">${p.name}</td>
        <td style="text-transform:capitalize">${p.gender}</td>
        <td>${p.age}</td>
        <td style="font-weight:700;color:#0C3060;font-size:15px">${booking.seats[i] || "—"}</td>
        <td>${p.email}</td>
        <td>${p.phone}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4f8; padding: 40px; }
  .page { background: white; border-radius: 20px; overflow: hidden; max-width: 720px; margin: 0 auto; box-shadow: 0 20px 60px rgba(12,48,96,0.15); }
  /* Header */
  .header { background: linear-gradient(135deg, #0C3060 0%, #1a5fa8 100%); color: white; padding: 32px 40px; display: flex; justify-content: space-between; align-items: flex-start; }
  .header-logo { font-size: 24px; font-weight: 800; }
  .header-sub { font-size: 11px; opacity: 0.7; margin-top: 4px; letter-spacing: 1px; text-transform: uppercase; }
  .header-right { text-align: right; }
  .header-ref-label { font-size: 9px; opacity: 0.7; letter-spacing: 1px; text-transform: uppercase; }
  .header-ref-value { font-size: 22px; font-weight: 800; letter-spacing: 3px; margin-top: 4px; }
  .header-status { display: inline-block; background: #22c55e; color: white; font-size: 10px; font-weight: 700; letter-spacing: 1px; padding: 3px 12px; border-radius: 20px; margin-top: 8px; text-transform: uppercase; }
  /* Route */
  .route { background: #EAF2FB; padding: 28px 40px; display: flex; align-items: center; }
  .route-end { flex: 1; }
  .route-code { font-size: 52px; font-weight: 800; color: #0C3060; line-height: 1; }
  .route-name { font-size: 12px; color: #7a90a4; margin-top: 4px; }
  .route-time { font-size: 16px; font-weight: 700; color: #0C3060; margin-top: 6px; }
  .route-date { font-size: 10px; color: #a0b4c8; margin-top: 2px; }
  .route-end.right { text-align: right; }
  .route-mid { flex: 1; text-align: center; padding: 0 20px; }
  .route-flight { font-size: 13px; font-weight: 700; color: #0C3060; margin-bottom: 8px; }
  .route-arrow { font-size: 28px; color: #1a5fa8; }
  .route-dur { font-size: 11px; color: #7a90a4; margin-top: 6px; }
  .route-stops { font-size: 10px; color: #a0b4c8; margin-top: 2px; }
  /* Section */
  .section { padding: 28px 40px; border-bottom: 1px solid #f0f4f8; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #7a90a4; margin-bottom: 16px; }
  /* Table */
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #a0b4c8; padding: 0 12px 10px 0; font-weight: 600; }
  td { padding: 10px 12px 10px 0; border-top: 1px solid #f5f8fc; color: #334155; vertical-align: top; }
  tr:first-child td { border-top: none; }
  /* Class badge */
  .class-badge { display: inline-block; background: #EAF2FB; color: #0C3060; font-size: 10px; font-weight: 700; padding: 4px 12px; border-radius: 20px; }
  /* QR + ref */
  .qr-section { display: flex; align-items: center; gap: 24px; padding: 24px 40px; background: #f8fbff; border-top: 1px solid #e8f0f8; }
  .qr-section img { width: 90px; height: 90px; border-radius: 10px; }
  .qr-text { flex: 1; }
  .qr-text-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #a0b4c8; margin-bottom: 4px; }
  .qr-text-value { font-size: 18px; font-weight: 800; color: #0C3060; letter-spacing: 2px; }
  .qr-text-sub { font-size: 10px; color: #a0b4c8; margin-top: 4px; }
  /* Footer */
  .footer { background: #0C3060; color: rgba(255,255,255,0.6); font-size: 10px; padding: 16px 40px; text-align: center; letter-spacing: 0.3px; }
</style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div>
      <div class="header-logo">✈ AirlineMS</div>
      <div class="header-sub">Electronic Ticket</div>
    </div>
    <div class="header-right">
      <div class="header-ref-label">Booking Reference</div>
      <div class="header-ref-value">${booking.bookingReference}</div>
      <div class="header-status">✓ Confirmed</div>
    </div>
  </div>

  <!-- Route -->
  <div class="route">
    <div class="route-end">
      <div class="route-code">${flight.source}</div>
      <div class="route-name">Origin</div>
      <div class="route-time">${fmtTime(flight.departureTime)}</div>
      <div class="route-date">${fmtDate(flight.departureTime)}</div>
    </div>
    <div class="route-mid">
      <div class="route-flight">${flight.flightNumber}</div>
      <div class="route-arrow">✈</div>
      <div class="route-dur">${durationStr}</div>
      <div class="route-stops">${stops}</div>
    </div>
    <div class="route-end right">
      <div class="route-code">${flight.destination}</div>
      <div class="route-name">Destination</div>
      <div class="route-time">${fmtTime(flight.arrivalTime)}</div>
      <div class="route-date">${fmtDate(flight.arrivalTime)}</div>
    </div>
  </div>

  <!-- Class + seats summary -->
  <div class="section">
    <div class="section-title">Booking Details</div>
    <div style="display:flex;gap:40px;flex-wrap:wrap">
      ${[
        ["Class",           `<span class="class-badge">${seatClass}</span>`],
        ["Passengers",      booking.passengerCount],
        ["Seats",           booking.seats.join(", ")],
        ["Booked On",       fmtDate(booking.createdAt)],
        ["Payment Status",  "Paid"],
        ["Payment ID",      `<span style="font-size:10px;color:#7a90a4">${booking.razorpayPaymentId || "—"}</span>`],
      ].map(([label, value]) => `
        <div>
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#a0b4c8;margin-bottom:6px">${label}</div>
          <div style="font-size:13px;font-weight:600;color:#0C3060">${value}</div>
        </div>`).join("")}
    </div>
  </div>

  <!-- Passengers table -->
  <div class="section">
    <div class="section-title">Passengers</div>
    <table>
      <thead>
        <tr>
          <th>#</th><th>Name</th><th>Gender</th><th>Age</th><th>Seat</th><th>Email</th><th>Phone</th>
        </tr>
      </thead>
      <tbody>${passengersRows}</tbody>
    </table>
  </div>

  <!-- QR -->
  <div class="qr-section">
    <img src="${qrDataUri}" alt="QR"/>
    <div class="qr-text">
      <div class="qr-text-label">Booking Reference</div>
      <div class="qr-text-value">${booking.bookingReference}</div>
      <div class="qr-text-sub">Scan at check-in counter · Valid for named passengers only</div>
    </div>
  </div>

  <div class="footer">AirlineMS · Electronic Ticket · ${fmtDate(booking.createdAt)} · This document is system-generated and does not require a signature.</div>
</div>
</body>
</html>`;
}

/* -------------------------------------------------------------------------- */
/*                            INVOICE TEMPLATE                                */
/* -------------------------------------------------------------------------- */

async function buildInvoiceHtml(booking, flight) {
  const seatClass   = CLASS_LABEL[booking.seatClass] || booking.seatClass;
  const CLASS_MUL   = { economy: 1, business: 2.5, first: 4.5 };
  const multiplier  = CLASS_MUL[booking.seatClass] || 1;
  const basePrice   = flight.price || 0;
  const farePerPax  = Math.round(basePrice * multiplier);
  const subtotal    = farePerPax * booking.passengerCount;
  const total       = booking.totalAmount;
  const invoiceNo   = `INV-${booking.bookingReference}`;

  const lineItems = booking.passengers
    .map(
      (p, i) => `
      <tr>
        <td style="color:#334155">${p.name}</td>
        <td>${seatClass}</td>
        <td>${booking.seats[i] || "—"}</td>
        <td style="text-align:right">₹${farePerPax.toLocaleString("en-IN")}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4f8; padding: 40px; }
  .page { background: white; border-radius: 20px; overflow: hidden; max-width: 680px; margin: 0 auto; box-shadow: 0 20px 60px rgba(12,48,96,0.15); }
  .header { background: linear-gradient(135deg, #0C3060 0%, #1a5fa8 100%); color: white; padding: 32px 40px; display: flex; justify-content: space-between; align-items: flex-start; }
  .header-logo { font-size: 24px; font-weight: 800; }
  .header-sub  { font-size: 11px; opacity: 0.7; margin-top: 4px; letter-spacing: 1px; text-transform: uppercase; }
  .invoice-no  { font-size: 14px; font-weight: 700; letter-spacing: 1px; }
  .invoice-date{ font-size: 11px; opacity: 0.7; margin-top: 4px; }
  /* Meta */
  .meta { display: flex; padding: 28px 40px; gap: 0; border-bottom: 1px solid #f0f4f8; }
  .meta-block { flex: 1; }
  .meta-block + .meta-block { border-left: 1px solid #f0f4f8; padding-left: 32px; }
  .meta-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #a0b4c8; margin-bottom: 6px; }
  .meta-value { font-size: 13px; font-weight: 600; color: #0C3060; line-height: 1.6; }
  /* Flight summary */
  .flight-bar { background: #EAF2FB; margin: 0 40px 28px; border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px; }
  .flight-bar-code { font-size: 22px; font-weight: 800; color: #0C3060; }
  .flight-bar-sep { font-size: 18px; color: #b0c4d8; }
  .flight-bar-meta { flex: 1; font-size: 11px; color: #7a90a4; }
  .flight-bar-num { font-size: 11px; font-weight: 700; color: #0C3060; background: white; padding: 3px 10px; border-radius: 20px; }
  /* Table */
  .section { padding: 0 40px 28px; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #7a90a4; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #a0b4c8; padding-bottom: 10px; font-weight: 600; border-bottom: 1px solid #f0f4f8; }
  th:last-child { text-align: right; }
  td { padding: 10px 0; border-bottom: 1px solid #f8fbff; color: #334155; vertical-align: top; }
  /* Totals */
  .totals { margin: 0 40px 28px; }
  .totals-row { display: flex; justify-content: space-between; font-size: 12px; color: #7a90a4; padding: 6px 0; }
  .totals-divider { height: 1px; background: #e8f0f8; margin: 8px 0; }
  .totals-final { display: flex; justify-content: space-between; font-size: 18px; font-weight: 800; color: #0C3060; padding: 10px 0 0; }
  /* Payment confirmation */
  .payment-box { margin: 0 40px 28px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px 20px; display: flex; gap: 12px; align-items: flex-start; }
  .payment-check { width: 32px; height: 32px; background: #22c55e; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 16px; flex-shrink: 0; }
  .payment-text-title { font-size: 13px; font-weight: 700; color: #166534; }
  .payment-text-sub   { font-size: 11px; color: #4ade80; margin-top: 2px; }
  /* Footer */
  .footer { background: #0C3060; color: rgba(255,255,255,0.6); font-size: 10px; padding: 16px 40px; text-align: center; }
</style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div>
      <div class="header-logo">✈ AirlineMS</div>
      <div class="header-sub">Tax Invoice</div>
    </div>
    <div style="text-align:right">
      <div class="invoice-no">${invoiceNo}</div>
      <div class="invoice-date">Date: ${fmtDate(booking.createdAt)}</div>
    </div>
  </div>

  <!-- Bill to / flight info -->
  <div class="meta">
    <div class="meta-block">
      <div class="meta-label">Bill To</div>
      <div class="meta-value">
        ${booking.passengers[0]?.name}<br/>
        ${booking.passengers[0]?.email}<br/>
        ${booking.passengers[0]?.phone}
      </div>
    </div>
    <div class="meta-block">
      <div class="meta-label">Payment Info</div>
      <div class="meta-value">
        Razorpay<br/>
        <span style="font-size:10px;color:#7a90a4">${booking.razorpayPaymentId || "—"}</span><br/>
        <span style="font-size:10px;color:#7a90a4">${booking.razorpayOrderId || "—"}</span>
      </div>
    </div>
    <div class="meta-block">
      <div class="meta-label">Booking Reference</div>
      <div class="meta-value">
        ${booking.bookingReference}<br/>
        <span style="font-size:10px;color:#7a90a4">Status: Confirmed</span>
      </div>
    </div>
  </div>

  <!-- Flight summary bar -->
  <div class="flight-bar">
    <div class="flight-bar-code">${flight.source}</div>
    <div class="flight-bar-sep">→</div>
    <div class="flight-bar-code">${flight.destination}</div>
    <div class="flight-bar-meta">
      ${fmtDate(flight.departureTime)} · ${fmtTime(flight.departureTime)} → ${fmtTime(flight.arrivalTime)}
    </div>
    <div class="flight-bar-num">${flight.flightNumber}</div>
  </div>

  <!-- Line items -->
  <div class="section">
    <div class="section-title">Fare Breakdown</div>
    <table>
      <thead>
        <tr><th>Passenger</th><th>Class</th><th>Seat</th><th style="text-align:right">Amount</th></tr>
      </thead>
      <tbody>${lineItems}</tbody>
    </table>
  </div>

  <!-- Totals -->
  <div class="totals">
    <div class="totals-row"><span>Total (${booking.passengerCount} × ₹${farePerPax.toLocaleString("en-IN")})</span><span>₹${subtotal.toLocaleString("en-IN")}</span></div>
    <div class="totals-divider"></div>
    <div class="totals-final"><span>Total Paid</span><span>₹${total.toLocaleString("en-IN")}</span></div>
  </div>

  <!-- Payment confirmed -->
  <div class="payment-box">
    <div class="payment-check">✓</div>
    <div>
      <div class="payment-text-title">Payment Successful</div>
      <div class="payment-text-sub">₹${total.toLocaleString("en-IN")} paid via Razorpay · ${fmt(booking.createdAt)}</div>
    </div>
  </div>

  <div class="footer">AirlineMS · Tax Invoice · ${invoiceNo} · This is a computer-generated invoice and does not require a physical signature.</div>
</div>
</body>
</html>`;
}

/* -------------------------------------------------------------------------- */
/*                           MAIN EXPORT FUNCTION                             */
/* -------------------------------------------------------------------------- */

/**
 * Generates all PDFs for a booking.
 * Returns: { boardingPasses: Buffer[], ticket: Buffer, invoice: Buffer }
 *
 * @param {Object} booking  - populated booking document
 * @param {Object} flight   - populated flight document
 */
export async function generateBookingPDFs(booking, flight) {
  // Single browser instance for all renders
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  try {
    // Generate QR once — embed in all documents
    const qrDataUri = await generateQR(booking.bookingReference);

    /* ── Boarding passes: one per passenger ── */
    const boardingPasses = [];
    for (let i = 0; i < booking.passengers.length; i++) {
      const html = await buildBoardingPassHtml(
        booking.passengers[i],
        booking.seats[i] || "—",
        i,
        booking,
        flight,
        qrDataUri,
      );
      const pdf = await htmlToPdf(html, browser);
      boardingPasses.push(pdf);
    }

    /* ── E-ticket: full booking summary ── */
    const ticketHtml = await buildTicketHtml(booking, flight, qrDataUri);
    const ticket     = await htmlToPdf(ticketHtml, browser);

    /* ── Invoice: payment receipt ── */
    const invoiceHtml = await buildInvoiceHtml(booking, flight);
    const invoice     = await htmlToPdf(invoiceHtml, browser);

    return { boardingPasses, ticket, invoice };

  } finally {
    await browser.close();
  }
}