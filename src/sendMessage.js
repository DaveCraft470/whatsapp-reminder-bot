const axios = require("axios");
require("dotenv").config();

/**
 * Sends an outbound WhatsApp message via the Meta Cloud API.
 * Throws on non-2xx responses — callers should handle appropriately.
 */
async function sendWhatsAppMessage(phone, message) {
  await axios.post(
    `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { body: message },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

module.exports = sendWhatsAppMessage;