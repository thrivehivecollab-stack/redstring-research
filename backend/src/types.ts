import type { auth } from "./auth";

// Infer user and session types directly from the auth instance so plugin fields are included
export type AuthUser = typeof auth.$Infer.Session.user;
export type AuthSession = typeof auth.$Infer.Session.session;

// Hono context variables — typed so c.set/c.get work across all routes
export type HonoVariables = {
  user: AuthUser;
  session: AuthSession;
};
