require('dotenv').config();

async function sendWhatsApp(to, body) {
  try {
    if (!to) {
      console.log('[WhatsApp Error] No recipient phone number provided');
      return;
    }

    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;

    // Clean phone number: remove everything except digits. Must include country code without '+'.
    const cleanTo = to.replace(/\D/g, '');

    if (token && phoneId && phoneId !== 'your_whatsapp_phone_number_id_here') {
      const url = `https://graph.facebook.com/v17.0/${phoneId}/messages`;
      
      const payload = {
        messaging_product: "whatsapp",
        to: cleanTo,
        type: "text",
        text: { body }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        console.error(`[WhatsApp Error] Failed to send to ${cleanTo}:`, data);
      } else {
        console.log(`[WhatsApp sent to ${cleanTo}] Body: ${body}`);
      }
    } else {
      // Mock mode
      console.log(`[Mock WhatsApp sent to ${cleanTo}] Body: ${body}`);
      console.warn('Set WHATSAPP_PHONE_ID in .env to enable real WhatsApp messaging.');
    }
  } catch (err) {
    console.error('Failed to send WhatsApp message:', err);
  }
}

module.exports = { sendWhatsApp };
