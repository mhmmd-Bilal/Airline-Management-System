// utils/qrHelper.js
import QRCode from "qrcode";

/**
 * Generates a base64-encoded PNG QR code for a given value.
 * Returns a data URI string safe to embed in HTML <img src="...">
 */
export async function generateQR(value) {
  try {
    const dataUri = await QRCode.toDataURL(String(value), {
      width:         200,
      margin:        1,
      color: {
        dark:  "#0C3060",
        light: "#FFFFFF",
      },
    });
    return dataUri;
  } catch {
    return "";
  }
}