import "@vibecodeapp/proxy"; // DO NOT REMOVE OTHERWISE VIBECODE PROXY WILL NOT WORK
import { Hono } from "hono";
import { cors } from "hono/cors";
import "./env";
import { env } from "./env";
import { logger } from "hono/logger";
import { auth, lastDevOtp } from "./auth";
import type { HonoVariables } from "./types";
import { sampleRouter } from "./routes/sample";
import { collabRouter } from "./routes/collab";
import { meRouter } from "./routes/me";
import { sourcesRouter } from "./routes/sources";
import { tipsRouter } from "./routes/tips";
import { aiRouter } from "./routes/ai";
import { broadcastRouter } from "./routes/broadcast";
import { warRoomRouter } from "./routes/warroom";
import { livestreamRouter } from "./routes/livestream";
import { publicTipsRouter } from "./routes/public-tips";
import { permissionsRouter } from "./routes/permissions";
import { shareLogRouter } from "./routes/share-log";
import { ownerNotificationsRouter } from "./routes/owner-notifications";
import { keysRouter } from "./routes/keys";
import { provenanceRouter } from "./routes/provenance";

const app = new Hono<{ Variables: HonoVariables }>();

// CORS middleware - validates origin against allowlist
const allowed = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/[a-z0-9-]+\.dev\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecodeapp\.com$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.dev$/,
  /^https:\/\/vibecode\.dev$/,
];

app.use(
  "*",
  cors({
    origin: (origin) => (origin && allowed.some((re) => re.test(origin)) ? origin : null),
    credentials: true,
  })
);

// Logging
app.use("*", logger());

// Better Auth middleware — injects session/user into context
app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (session) {
    c.set("user", session.user);
    c.set("session", session.session);
  }
  await next();
});

// Better Auth handler — handles all /api/auth/* routes
app.all("/api/auth/*", (c) => auth.handler(c.req.raw));

// Health check endpoint
app.get("/health", (c) => c.json({ status: "ok" }));

// Routes
app.route("/api/sample", sampleRouter);
app.route("/api/collab", collabRouter);
app.route("/api/me", meRouter);
app.route("/api/sources", sourcesRouter);
app.route("/api/tips", tipsRouter);
app.route("/api/ai", aiRouter);
app.route("/api/broadcast", broadcastRouter);
app.route("/api/warroom", warRoomRouter);
app.route("/api/livestream", livestreamRouter);
app.route("/tip", publicTipsRouter);
app.route("/api/permissions", permissionsRouter);
app.route("/api/share-log", shareLogRouter);
app.route("/api/owner-notifications", ownerNotificationsRouter);
app.route("/api/keys", keysRouter);
app.route("/api/provenance", provenanceRouter);

// Dev-only route to expose last OTP code
if (env.NODE_ENV !== "production") {
  app.get("/api/dev/last-otp", (c) => {
    return c.json({ data: lastDevOtp ?? { code: null, phone: null } });
  });
}

const port = Number(process.env.PORT) || 3000;

export default {
  port,
  fetch: app.fetch,
};
