import nodemailer from "nodemailer";

const json = (data, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return json({ success: false, error: "Method not allowed" }, 405);
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return json({ success: false, error: "JSON body required" }, 415);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ success: false, error: "Invalid JSON" }, 400);
    }

    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const language = body?.language === "en" ? "en" : "pt";
    const website = typeof body?.website === "string" ? body.website.trim() : "";
    const testRecipient = body?.testRecipient === "mujtaba.builds@gmail.com"
      ? body.testRecipient
      : "";

    // Honeypot field: real customers never see or fill it.
    if (website) return json({ success: true });
    if (!message || message.length > 6000) {
      return json({ success: false, error: "Invalid message" }, 400);
    }

    const host = process.env.SMTP_HOST;
    const port = Number.parseInt(process.env.SMTP_PORT || "587", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const recipient = testRecipient || process.env.QUOTE_RECIPIENT || "leonardo@caochorro.com.br";

    if (!host || !Number.isInteger(port) || !user || !pass) {
      console.error("Email service is missing SMTP configuration");
      return json({ success: false, error: "Email service is not configured" }, 503);
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });

    try {
      const info = await transporter.sendMail({
        from: `"Cão Chorro Pet Shop" <${user}>`,
        to: recipient,
        subject:
          language === "en"
            ? "Quote request — Cão Chorro Pet Shop"
            : "Solicitação de orçamento — Cão Chorro Pet Shop",
        text: message,
      });

      return json({ success: true, messageId: info.messageId });
    } catch (error) {
      console.error("SMTP delivery failed", error);
      return json({ success: false, error: "Email could not be sent" }, 502);
    }
  },
};
