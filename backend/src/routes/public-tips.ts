import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import type { HonoVariables } from "../types";

export const publicTipsRouter = new Hono<{ Variables: HonoVariables }>();

async function sendPushNotificationToUser(
  userId: string,
  notification: { title: string; body: string; data?: Record<string, unknown> }
): Promise<void> {
  try {
    const tokens = await prisma.pushToken.findMany({ where: { userId } });
    if (tokens.length === 0) return;
    await Promise.all(
      tokens.map((t) =>
        fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: t.token, title: notification.title, body: notification.body, data: notification.data ?? {} }),
        }).catch(() => null)
      )
    );
  } catch {
    // fire and forget
  }
}

const HTML_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0F0D0B; color: #E8DCC8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .card { background: #1A1714; border: 1px solid #272320; border-radius: 20px; padding: 32px; max-width: 520px; width: 100%; }
  .logo { color: #C41E3A; font-size: 13px; font-weight: 900; letter-spacing: 3px; margin-bottom: 4px; }
  h1 { font-size: 22px; font-weight: 800; color: #E8DCC8; margin-bottom: 6px; }
  .subtitle { color: #6B5D4F; font-size: 14px; margin-bottom: 28px; line-height: 1.5; }
  label { display: block; font-size: 12px; font-weight: 700; letter-spacing: 1.5px; color: #6B5D4F; text-transform: uppercase; margin-bottom: 8px; }
  input, textarea, select { width: 100%; background: #0F0D0B; border: 1px solid #272320; border-radius: 10px; color: #E8DCC8; font-size: 15px; padding: 12px 14px; outline: none; transition: border-color 0.2s; font-family: inherit; }
  input:focus, textarea:focus, select:focus { border-color: #C41E3A; }
  textarea { resize: vertical; min-height: 120px; }
  select option { background: #1A1714; }
  .field { margin-bottom: 20px; }
  .anon-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(196,30,58,0.1); border: 1px solid rgba(196,30,58,0.25); border-radius: 8px; padding: 6px 12px; font-size: 12px; color: #C41E3A; font-weight: 600; margin-bottom: 24px; }
  button[type=submit] { width: 100%; background: #C41E3A; color: #fff; border: none; border-radius: 12px; padding: 15px; font-size: 16px; font-weight: 700; cursor: pointer; transition: opacity 0.2s; }
  button[type=submit]:hover { opacity: 0.85; }
  .success { text-align: center; padding: 24px 0; }
  .success .check { font-size: 48px; margin-bottom: 12px; }
  .success h2 { font-size: 20px; font-weight: 800; margin-bottom: 8px; }
  .success p { color: #6B5D4F; font-size: 14px; }
  .error-msg { background: rgba(196,30,58,0.1); border: 1px solid rgba(196,30,58,0.3); border-radius: 8px; padding: 12px; color: #C41E3A; font-size: 14px; margin-bottom: 16px; display: none; }
`;

function buildFormPage(username: string, error?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Submit a Tip — Red String</title>
  <style>${HTML_STYLES}</style>
</head>
<body>
  <div class="card">
    <div class="logo">RED STRING</div>
    <h1>Submit a Tip to @${username}</h1>
    <p class="subtitle">Your identity is never stored. Tips are anonymous by default.</p>
    <div class="anon-badge">🔒 Anonymous Submission</div>
    ${error ? `<div class="error-msg" style="display:block">${error}</div>` : ''}
    <form method="POST" action="/tip/${username}">
      <div class="field">
        <label>Your Tip *</label>
        <textarea name="content" placeholder="Share what you know. Be as specific as possible." required></textarea>
      </div>
      <div class="field">
        <label>Subject / Title *</label>
        <input type="text" name="subject" placeholder="Brief summary of your tip" required maxlength="200">
      </div>
      <div class="field">
        <label>Contact (optional)</label>
        <input type="text" name="contactInfo" placeholder="Email, Signal, or other contact (not stored with your tip)">
      </div>
      <button type="submit">Submit Tip Securely →</button>
    </form>
  </div>
</body>
</html>`;
}

function buildSuccessPage(username: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tip Submitted — Red String</title>
  <style>${HTML_STYLES}</style>
</head>
<body>
  <div class="card">
    <div class="logo">RED STRING</div>
    <div class="success">
      <div class="check">✅</div>
      <h2>Tip Received</h2>
      <p>Your tip has been securely delivered to @${username}.<br>Your identity was never stored.</p>
    </div>
  </div>
</body>
</html>`;
}

// GET /tip/:username — public tip submission form
publicTipsRouter.get("/:username", async (c) => {
  const username = c.req.param("username");
  const user = await prisma.user.findFirst({ where: { username } });
  if (!user) {
    return c.html(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${HTML_STYLES}</style></head><body><div class="card"><div class="logo">RED STRING</div><h1>Not Found</h1><p class="subtitle">No investigator found with that username.</p></div></body></html>`, 404);
  }
  return c.html(buildFormPage(username));
});

// POST /tip/:username — form submission (HTML form POST)
publicTipsRouter.post("/:username", async (c) => {
  const username = c.req.param("username");
  const user = await prisma.user.findFirst({ where: { username } });
  if (!user) {
    return c.html(buildFormPage(username, "Investigator not found."), 404);
  }

  let subject = "";
  let content = "";
  let contactInfo = "";

  const ct = c.req.header("content-type") ?? "";
  if (ct.includes("application/json")) {
    const body = await c.req.json().catch(() => ({})) as Record<string, string>;
    subject = (body.subject ?? "").trim();
    content = (body.content ?? "").trim();
    contactInfo = (body.contactInfo ?? "").trim();
  } else {
    const form = await c.req.parseBody().catch(() => ({})) as Record<string, string>;
    subject = (form.subject ?? "").trim();
    content = (form.content ?? "").trim();
    contactInfo = (form.contactInfo ?? "").trim();
  }

  if (!subject || !content) {
    if (ct.includes("application/json")) {
      return c.json({ error: { message: "Subject and content are required", code: "INVALID_INPUT" } }, 400);
    }
    return c.html(buildFormPage(username, "Subject and tip content are required."), 400);
  }

  const tip = await prisma.tip.create({
    data: {
      recipientId: user.id,
      isAnonymous: true,
      subject,
      content,
      tipperEmail: contactInfo && contactInfo.includes("@") ? contactInfo : null,
      tipperHandle: contactInfo && !contactInfo.includes("@") ? contactInfo : null,
      status: "unread",
    },
  });

  // Push notification — fire and forget, no IP stored
  sendPushNotificationToUser(user.id, {
    title: "New Tip Received",
    body: subject,
    data: { tipId: tip.id },
  });

  if (ct.includes("application/json")) {
    return c.json({ data: { success: true, tipId: tip.id } });
  }
  return c.html(buildSuccessPage(username));
});

// POST /api/public-tips/:username — JSON API version
publicTipsRouter.post("/api/:username", zValidator("json", z.object({
  subject: z.string().min(1).max(200),
  content: z.string().min(1),
  contactInfo: z.string().optional(),
})), async (c) => {
  const username = c.req.param("username");
  const { subject, content, contactInfo } = c.req.valid("json");
  const user = await prisma.user.findFirst({ where: { username } });
  if (!user) {
    return c.json({ error: { message: "Investigator not found", code: "NOT_FOUND" } }, 404);
  }

  const tip = await prisma.tip.create({
    data: {
      recipientId: user.id,
      isAnonymous: true,
      subject,
      content,
      tipperEmail: contactInfo && contactInfo.includes("@") ? contactInfo : null,
      tipperHandle: contactInfo && !contactInfo.includes("@") ? contactInfo : null,
      status: "unread",
    },
  });

  sendPushNotificationToUser(user.id, {
    title: "New Tip Received",
    body: subject,
    data: { tipId: tip.id },
  });

  return c.json({ data: { success: true, tipId: tip.id } });
});
