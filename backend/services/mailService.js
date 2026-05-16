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
