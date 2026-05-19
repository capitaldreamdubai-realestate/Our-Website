/**
 * DataPulseFlow webhook starter (Node.js + Express)
 * Run: npm i express
 * Then: node node-express-webhooks-example.js
 */
const crypto = require("crypto");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 5050;
const DPF_WEBHOOK_SECRET = process.env.DPF_WEBHOOK_SECRET || "dpfwhsec_replace_me";

// Keep raw body for signature verification.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  })
);

const processedEvents = new Set();

function verifySignature(req) {
  const timestamp = req.header("x-dpf-timestamp");
  const signature = req.header("x-dpf-signature");
  if (!timestamp || !signature || !req.rawBody) return false;

  const maxDriftSeconds = 300;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > maxDriftSeconds) return false;

  const payload = `${timestamp}.${req.rawBody}`;
  const expected = crypto
    .createHmac("sha256", DPF_WEBHOOK_SECRET)
    .update(payload, "utf8")
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

app.post("/integrations/datapulseflow/webhook", async (req, res) => {
  if (!verifySignature(req)) {
    return res.status(401).json({ error: "invalid signature" });
  }

  const event = req.body;
  if (!event?.event_id || !event?.event_type) {
    return res.status(400).json({ error: "invalid event envelope" });
  }

  if (processedEvents.has(event.event_id)) {
    return res.status(200).json({ status: "duplicate_ignored" });
  }
  processedEvents.add(event.event_id);

  // In production: enqueue to background worker, then return quickly.
  switch (event.event_type) {
    case "property.updated":
      console.log("Property updated:", event.data?.property_id);
      break;
    case "lead.created":
      console.log("Lead created:", event.data?.lead_id);
      break;
    case "crm.whatsapp.message.received":
      console.log("WhatsApp message received:", event.data?.message_id);
      break;
    default:
      console.log("Unhandled event:", event.event_type);
  }

  return res.status(202).json({ status: "accepted" });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "datapulseflow-webhook-starter" });
});

app.listen(PORT, () => {
  console.log(`DataPulseFlow starter listening on http://localhost:${PORT}`);
});

