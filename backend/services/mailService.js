// services/mailService.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

/* -------------------------------------------------------------------------- */
/*                           TRANSPORTER SETUP                                */
/* -------------------------------------------------------------------------- */

/*
 * For local development we use Gmail with an App Password.
 * In .env set:
 *   MAIL_USER=your.email@gmail.com
 *   MAIL_PASS=your_16_char_app_password   ← Gmail → Account → Security → App passwords
 *   MAIL_FROM="AirlineMS <your.email@gmail.com>"
 *
 * For production swap to your SMTP provider (SendGrid, Resend, AWS SES, etc.)
 * by changing host/port/auth below.
 */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

/* -------------------------------------------------------------------------- */
/*                          HTML EMAIL TEMPLATE                               */
/* -------------------------------------------------------------------------- */

function buildEmailHtml(booking, flight) {
  const fmt = (dt) =>
    dt
      ? new Date(dt).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "—";

  const CLASS_LABEL = {
    economy: "Economy",
    business: "Business Class",
    first: "First Class",
  };
  const seatClass = CLASS_LABEL[booking.seatClass] || booking.seatClass;

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(12,48,96,0.12);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0C3060 0%,#1a5fa8 100%);padding:32px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="font-size:22px;font-weight:800;color:white;">✈ AirlineMS</div>
                  <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:4px;letter-spacing:1px;text-transform:uppercase;">Booking Confirmation</div>
                </td>
                <td align="right">
                  <div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:10px 18px;display:inline-block;">
                    <div style="font-size:9px;color:rgba(255,255,255,0.7);letter-spacing:1px;text-transform:uppercase;">Booking Ref</div>
                    <div style="font-size:18px;font-weight:800;color:white;letter-spacing:2px;margin-top:2px;">${booking.bookingReference}</div>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:32px 40px 0;">
            <div style="font-size:20px;font-weight:700;color:#0C3060;margin-bottom:8px;">
              Your booking is confirmed! 🎉
            </div>
            <div style="font-size:14px;color:#64748b;line-height:1.6;">
              Hi <strong>${booking.passengers[0]?.name}</strong>, your flight is all set.
              Please find your boarding pass, e-ticket, and invoice attached to this email.
            </div>
          </td>
        </tr>

        <!-- Flight card -->
        <tr>
          <td style="padding:24px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#EAF2FB;border-radius:16px;overflow:hidden;">
              <tr>
                <td style="padding:24px 28px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="text-align:left">
                        <div style="font-size:42px;font-weight:800;color:#0C3060;line-height:1;">${flight.source}</div>
                        <div style="font-size:11px;color:#7a90a4;margin-top:4px;">Origin</div>
                        <div style="font-size:15px;font-weight:700;color:#0C3060;margin-top:6px;">${fmt(flight.departureTime)}</div>
                      </td>
                      <td style="text-align:center;padding:0 20px;">
                        <div style="font-size:12px;font-weight:700;color:#0C3060;margin-bottom:6px;">${flight.flightNumber}</div>
                        <div style="font-size:24px;color:#1a5fa8;">✈</div>
                        <div style="font-size:11px;color:#7a90a4;margin-top:6px;">${seatClass}</div>
                      </td>
                      <td style="text-align:right">
                        <div style="font-size:42px;font-weight:800;color:#0C3060;line-height:1;">${flight.destination}</div>
                        <div style="font-size:11px;color:#7a90a4;margin-top:4px;">Destination</div>
                        <div style="font-size:15px;font-weight:700;color:#0C3060;margin-top:6px;">${fmt(flight.arrivalTime)}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Details grid -->
        <tr>
          <td style="padding:0 40px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${[
                  ["Passengers", booking.passengerCount],
                  ["Seats", booking.seats.join(", ")],
                  [
                    "Total Paid",
                    `₹${booking.totalAmount?.toLocaleString("en-IN")}`,
                  ],
                  ["Payment Status", "✓ Paid"],
                ]
                  .map(
                    ([label, value]) => `
                  <td style="flex:1;background:#f8fbff;border-radius:12px;padding:16px;text-align:center;border:1px solid #e8f0f8;">
                    <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#a0b4c8;margin-bottom:6px;">${label}</div>
                    <div style="font-size:15px;font-weight:700;color:#0C3060;">${value}</div>
                  </td>`,
                  )
                  .join('<td style="width:8px"></td>')}
              </tr>
            </table>
          </td>
        </tr>

        <!-- Passengers list -->
        <tr>
          <td style="padding:0 40px 24px;">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#7a90a4;margin-bottom:12px;">Passengers</div>
            ${booking.passengers
              .map(
                (p, i) => `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td style="padding:12px 16px;background:#f8fbff;border-radius:10px;border:1px solid #e8f0f8;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <div style="width:28px;height:28px;background:#EAF2FB;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#0C3060;vertical-align:middle;margin-right:10px;">${i + 1}</div>
                          <span style="font-size:13px;font-weight:600;color:#0C3060;">${p.name}</span>
                          <span style="font-size:11px;color:#7a90a4;margin-left:8px;">${p.email}</span>
                        </td>
                        <td align="right">
                          <span style="font-size:16px;font-weight:800;color:#0C3060;">${booking.seats[i] || "—"}</span>
                          <span style="font-size:10px;color:#7a90a4;margin-left:4px;">${seatClass}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>`,
              )
              .join("")}
          </td>
        </tr>

        <!-- Attachments note -->
        <tr>
          <td style="padding:0 40px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e1;border:1px solid #ffe082;border-radius:12px;">
              <tr>
                <td style="padding:16px 20px;">
                  <div style="font-size:13px;font-weight:700;color:#f59e0b;margin-bottom:6px;">📎 3 documents attached</div>
                  <div style="font-size:12px;color:#92400e;line-height:1.7;">
                    <strong>Boarding Pass</strong> — Present at the gate (one per passenger)<br/>
                    <strong>E-Ticket</strong> — Full booking summary with all passenger details<br/>
                    <strong>Invoice</strong> — Tax invoice with payment receipt
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Tips -->
        <tr>
          <td style="padding:0 40px 32px;">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#7a90a4;margin-bottom:12px;">Important Reminders</div>
            ${[
              "Arrive at the airport at least 2 hours before departure",
              "Carry a valid government-issued photo ID for each passenger",
              "Boarding closes 30 minutes before departure",
              "Cancellations are allowed up to 2 hours before departure",
            ]
              .map(
                (tip) => `
              <div style="font-size:12px;color:#64748b;padding:6px 0;border-bottom:1px solid #f5f8fc;display:flex;gap:8px;">
                <span style="color:#22c55e;font-weight:700;">✓</span> ${tip}
              </div>`,
              )
              .join("")}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0C3060;padding:20px 40px;text-align:center;">
            <div style="color:rgba(255,255,255,0.5);font-size:10px;letter-spacing:0.3px;">
              © ${new Date().getFullYear()} AirlineMS · This is an automated email, please do not reply.
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}


/**
 * Build the HTML body for the crew assignment email.
 */
function buildCrewAssignmentHtml(crew, user, flight) {
  const fmt = (dt) =>
    dt
      ? new Date(dt).toLocaleString("en-IN", {
          weekday: "short",
          day:     "2-digit",
          month:   "long",
          year:    "numeric",
          hour:    "2-digit",
          minute:  "2-digit",
          hour12:  true,
        })
      : "—";

  const duration = (() => {
    if (!flight.departureTime || !flight.arrivalTime) return "—";
    const mins  = Math.round(
      (new Date(flight.arrivalTime) - new Date(flight.departureTime)) / 60000
    );
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  })();

  const stops =
    Array.isArray(flight.routes) && flight.routes.length > 2
      ? flight.routes.slice(1, -1).join(" → ")
      : "Non-stop";

  const statusColor = {
    scheduled: "#1565C0",
    delayed:   "#E65100",
    boarding:  "#4527A0",
    cancelled: "#B71C1C",
  }[flight.status] || "#1565C0";

  const statusLabel = {
    scheduled: "Scheduled",
    delayed:   "Delayed",
    boarding:  "Boarding",
    cancelled: "Cancelled",
  }[flight.status] || flight.status;

  return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Flight Assignment — ${flight.flightNumber}</title>
</head>
<body style="margin:0;padding:0;background:#EAF4FB;font-family:'Segoe UI',Arial,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#EAF4FB;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- ── Header ── -->
          <tr>
            <td style="background:linear-gradient(135deg,#0D2540 0%,#1565C0 100%);border-radius:20px 20px 0 0;padding:36px 40px;text-align:center;position:relative;overflow:hidden;">
              <!-- Logo row -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align:center;padding-bottom:24px;">
                    <span style="display:inline-flex;align-items:center;gap:10px;">
                      <span style="background:rgba(255,255,255,0.15);border-radius:12px;width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;">
                        ✈️
                      </span>
                      <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.3px;">AirlineMS</span>
                    </span>
                  </td>
                </tr>
              </table>
              <!-- Heading -->
              <div style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:32px;display:inline-block;padding:6px 18px;margin-bottom:16px;">
                <span style="color:#90CAF9;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Flight Assignment</span>
              </div>
              <h1 style="color:#fff;font-size:32px;font-weight:900;margin:0 0 8px;letter-spacing:-0.5px;">
                You're assigned!
              </h1>
              <p style="color:rgba(255,255,255,0.75);font-size:14px;margin:0;">
                New flight assignment for <strong style="color:#fff;">${user.name}</strong>
              </p>
            </td>
          </tr>

          <!-- ── Body ── -->
          <tr>
            <td style="background:#fff;padding:0 40px 32px;">

              <!-- ── Route card ── -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;background:#EAF4FB;border-radius:16px;overflow:hidden;">
                <tr>
                  <td style="padding:24px;">

                    <!-- Flight number + status -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                      <tr>
                        <td>
                          <span style="font-size:13px;font-weight:700;color:#7A90A4;letter-spacing:1px;text-transform:uppercase;">Flight</span><br/>
                          <span style="font-size:24px;font-weight:900;color:#0D1B2A;">${flight.flightNumber}</span>
                        </td>
                        <td align="right">
                          <span style="background:${statusColor}18;color:${statusColor};font-size:11px;font-weight:700;padding:5px 14px;border-radius:32px;border:1px solid ${statusColor}40;text-transform:uppercase;letter-spacing:1px;">
                            ${statusLabel}
                          </span>
                        </td>
                      </tr>
                    </table>

                    <!-- Origin → Destination -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                      <tr>
                        <td style="text-align:center;width:38%;">
                          <div style="font-size:36px;font-weight:900;color:#0D1B2A;line-height:1;">${
                            Array.isArray(flight.routes) && flight.routes.length > 0
                              ? flight.routes[0]
                              : flight.source
                          }</div>
                          <div style="font-size:12px;color:#7A90A4;margin-top:4px;font-weight:600;">${flight.source}</div>
                        </td>
                        <td style="text-align:center;width:24%;">
                          <div style="font-size:13px;color:#7A90A4;font-weight:600;margin-bottom:4px;">${duration}</div>
                          <div style="border-top:2px dashed #B0C4D8;position:relative;">
                            <span style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);font-size:18px;">✈️</span>
                          </div>
                          <div style="font-size:10px;color:#B0C4D8;margin-top:6px;">${stops}</div>
                        </td>
                        <td style="text-align:center;width:38%;">
                          <div style="font-size:36px;font-weight:900;color:#0D1B2A;line-height:1;">${
                            Array.isArray(flight.routes) && flight.routes.length > 0
                              ? flight.routes[flight.routes.length - 1]
                              : flight.destination
                          }</div>
                          <div style="font-size:12px;color:#7A90A4;margin-top:4px;font-weight:600;">${flight.destination}</div>
                        </td>
                      </tr>
                    </table>

                    <!-- Times -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
                      <tr>
                        <td style="padding:14px 20px;border-right:1px solid #EAF4FB;width:50%;">
                          <div style="font-size:10px;color:#7A90A4;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Departure</div>
                          <div style="font-size:13px;font-weight:700;color:#0D1B2A;">${fmt(flight.departureTime)}</div>
                        </td>
                        <td style="padding:14px 20px;width:50%;">
                          <div style="font-size:10px;color:#7A90A4;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Arrival</div>
                          <div style="font-size:13px;font-weight:700;color:#0D1B2A;">${fmt(flight.arrivalTime)}</div>
                        </td>
                      </tr>
                    </table>

                    <!-- Route stops (if any) -->
                    ${
                      Array.isArray(flight.routes) && flight.routes.length > 2
                        ? `<div style="margin-top:12px;padding:10px 14px;background:#fff;border-radius:10px;font-size:12px;color:#5A7089;">
                            <span style="font-weight:700;">Route:</span>
                            ${flight.routes.join(" → ")}
                           </div>`
                        : ""
                    }

                  </td>
                </tr>
              </table>

              <!-- ── Crew assignment details ── -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td colspan="2">
                    <div style="font-size:11px;font-weight:700;color:#7A90A4;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;border-bottom:1px solid #EAF4FB;padding-bottom:8px;">
                      Your assignment
                    </div>
                  </td>
                </tr>
                ${[
                  ["👤 Name",          user.name],
                  ["🪪 Employee ID",   crew.employeeId],
                  ["🎭 Role",          crew.role],
                  ["✈️ Flight",        flight.flightNumber],
                  ["🛫 Aircraft",      flight.aircraftId?.registrationNumber ?? "TBA"],
                  ["🪑 Total seats",   flight.totalSeats ?? "—"],
                  ["💺 Avail. seats",  flight.availableSeats ?? "—"],
                  ["💰 Your salary",   crew.salary ? `₹${Number(crew.salary).toLocaleString()}` : "—"],
                ].map(([label, value]) => /* html */`
                  <tr>
                    <td style="padding:9px 0;border-bottom:1px solid #F0F7FF;font-size:12px;color:#7A90A4;font-weight:600;width:48%;">${label}</td>
                    <td style="padding:9px 0;border-bottom:1px solid #F0F7FF;font-size:12px;color:#0D1B2A;font-weight:700;text-align:right;">${value ?? "—"}</td>
                  </tr>
                `).join("")}
              </table>

              <!-- ── Clearance section ── -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;background:#EAF4FB;border-radius:16px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <div style="font-size:11px;font-weight:700;color:#5A7089;letter-spacing:1px;text-transform:uppercase;margin-bottom:14px;">Crew clearance</div>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${[
                        ["Medical status",     crew.medicalStatus ?? "—",   crew.medicalStatus === "Fit"],
                        ["License number",     crew.licenseNumber ?? "—",   !!crew.licenseNumber],
                        ["Current status",     crew.currentStatus ?? "—",   crew.currentStatus === "On Duty"],
                      ].map(([label, value, ok]) => /* html */`
                        <tr>
                          <td style="font-size:12px;color:#5A7089;padding:5px 0;font-weight:600;">${label}</td>
                          <td style="text-align:right;padding:5px 0;">
                            <span style="background:${ok ? "#E8F5E9" : "#FFF3E0"};color:${ok ? "#2E7D32" : "#E65100"};font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;">
                              ${value}
                            </span>
                          </td>
                        </tr>
                      `).join("")}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- ── Action button ── -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td align="center">
                    <a href="${process.env.FRONTEND_URL ?? "http://localhost:3000"}/crew/flights"
                       style="display:inline-block;background:linear-gradient(135deg,#1565C0,#0D2540);color:#fff;font-size:14px;font-weight:800;padding:14px 40px;border-radius:14px;text-decoration:none;letter-spacing:0.3px;">
                      View my flights →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- ── Reminders ── -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;background:#FFF8E1;border:1px solid #FFE082;border-radius:14px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="font-size:12px;font-weight:800;color:#F57F17;margin-bottom:8px;">⏰ Pre-flight reminders</div>
                    <ul style="margin:0;padding-left:18px;">
                      ${[
                        `Report for duty <strong>60 minutes</strong> before departure`,
                        `Ensure medical certificate is current and available`,
                        `Check crew briefing board for last-minute updates`,
                        `Confirm uniform and ID badge are ready`,
                      ].map((r) => `<li style="font-size:12px;color:#795548;margin-bottom:5px;line-height:1.5;">${r}</li>`).join("")}
                    </ul>
                  </td>
                </tr>
              </table>

              <!-- ── Note ── -->
              <p style="font-size:11px;color:#B0C4D8;text-align:center;margin-top:24px;line-height:1.6;">
                This is an automated assignment notification from AirlineMS.<br/>
                If you have questions, contact operations at
                <a href="mailto:${process.env.MAIL_USER}" style="color:#1565C0;">${process.env.MAIL_USER}</a>.
              </p>
            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="background:#0D2540;border-radius:0 0 20px 20px;padding:20px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align:center;">
                    <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0 0 4px;">
                      © ${new Date().getFullYear()} AirlineMS · Flight Management System
                    </p>
                    <p style="color:rgba(255,255,255,0.3);font-size:10px;margin:0;">
                      This email was sent to ${user.email} because you are assigned to flight ${flight.flightNumber}.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}


/* -------------------------------------------------------------------------- */
/*                         SEND BOOKING EMAIL                                 */
/* -------------------------------------------------------------------------- */

/**
 * Sends booking confirmation email with all 3 PDFs attached.
 *
 * @param {Object}   booking       - populated booking document
 * @param {Object}   flight        - populated flight document
 * @param {Buffer[]} boardingPasses - one Buffer per passenger
 * @param {Buffer}   ticket        - e-ticket PDF buffer
 * @param {Buffer}   invoice       - invoice PDF buffer
 */
export async function sendBookingEmail({
  booking,
  flight,
  boardingPasses,
  ticket,
  invoice,
}) {
  const toEmail = booking.passengers[0]?.email;

  if (!toEmail) {
    console.warn(
      "[mailService] No email on first passenger — skipping mail send",
    );
    return;
  }

  // Build boarding pass attachments (one per passenger)
  const boardingPassAttachments = boardingPasses.map((buf, i) => ({
    filename: `boarding-pass-${booking.passengers[i]?.name?.replace(/\s+/g, "-") ?? i + 1}.pdf`,
    content: buf,
    contentType: "application/pdf",
  }));

  const mailOptions = {
    from: process.env.MAIL_FROM || `"AirlineMS" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: `Booking Confirmed — ${booking.bookingReference} · ${flight.source} → ${flight.destination}`,
    html: buildEmailHtml(booking, flight),
    attachments: [
      ...boardingPassAttachments,
      {
        filename: `e-ticket-${booking.bookingReference}.pdf`,
        content: ticket,
        contentType: "application/pdf",
      },
      {
        filename: `invoice-${booking.bookingReference}.pdf`,
        content: invoice,
        contentType: "application/pdf",
      },
    ],
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(
    `[mailService] Email sent → ${toEmail} | messageId: ${info.messageId}`,
  );
  return info;
}



/**
 * Send a flight assignment notification email to a crew member.
 *
 * @param {object} crew    — Crew document (employeeId, role, salary, medicalStatus, licenseNumber, currentStatus)
 * @param {object} user    — Populated userId (name, email)
 * @param {object} flight  — Flight document (flightNumber, source, destination, routes, departureTime, arrivalTime, totalSeats, availableSeats, aircraftId, status)
 */
export async function sendCrewAssignmentEmail({ crew, user, flight }) {
  const toEmail = user?.email;

  if (!toEmail) {
    console.warn("[mailService] Crew user has no email — skipping assignment mail");
    return;
  }

  const mailOptions = {
    from:    process.env.MAIL_FROM || `"AirlineMS" <${process.env.MAIL_USER}>`,
    to:      toEmail,
    subject: `Flight Assignment — ${flight.flightNumber} · ${flight.source} → ${flight.destination} · ${
      new Date(flight.departureTime).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
      })
    }`,
    html: buildCrewAssignmentHtml(crew, user, flight),
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(
    `[mailService] Crew assignment email sent → ${toEmail} | flight: ${flight.flightNumber} | messageId: ${info.messageId}`
  );
  return info;
}


/**
 * Send assignment emails to ALL newly added crew members on a flight.
 * Call this from updateFlight or createFlight after saving.
 *
 * @param {string[]} crewIds   — Array of Crew _ids that were just assigned
 * @param {object}   flight    — The saved flight document (populated or plain)
 */
export async function sendCrewAssignmentEmailsForFlight(crewIds, flight) {
  if (!crewIds?.length) return;

  const Crews = (await import("../models/crewModel.js")).default;

  const crewDocs = await Crews.find({ _id: { $in: crewIds } })
    .populate("userId", "name email")
    .lean();

  const results = await Promise.allSettled(
    crewDocs.map((crew) =>
      sendCrewAssignmentEmail({
        crew,
        user:   crew.userId,
        flight,
      })
    )
  );

  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(
        `[mailService] Failed to send assignment email to crew ${crewDocs[i]?._id}: ${r.reason?.message}`
      );
    }
  });
}