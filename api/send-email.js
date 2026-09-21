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
    // Honeypot field: real customers never see or fill it.
    if (website) return json({ success: true });
    if (!message || message.length > 6000) {
      return json({ success: false, error: "Invalid message" }, 400);
    }

    const recipient = process.env.QUOTE_RECIPIENT || "leonardo@caochorro.com.br";
    const subject =
      language === "en"
        ? "Website message — Cão Chorro Pet Shop"
        : "Mensagem do site — Cão Chorro Pet Shop";

    try {
      const response = await fetch(
        `https://formsubmit.co/ajax/${encodeURIComponent(recipient)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Origin: "https://cou-chorro.vercel.app",
            Referer: "https://cou-chorro.vercel.app/",
          },
          body: JSON.stringify({
            name: "Cão Chorro Pet Shop — site",
            message,
            _subject: subject,
            _template: "table",
            _captcha: "false",
            _url: "https://cou-chorro.vercel.app/",
          }),
          signal: AbortSignal.timeout(25000),
        },
      );
      const result = await response.json().catch(() => ({}));

      if (
        !response.ok ||
        result.success === false ||
        String(result.success).toLowerCase() === "false"
      ) {
        throw new Error(result.message || `FormSubmit returned ${response.status}`);
      }

      return json({
        success: true,
        provider: "formsubmit",
        message: result.message || "Submission accepted",
      });
    } catch (error) {
      console.error("FormSubmit delivery failed", error);
      return json({ success: false, error: "Email could not be sent" }, 502);
    }
  },
};
