import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { expo } from "@better-auth/expo";
import { username } from "better-auth/plugins";
import { prisma } from "./prisma";
import { env } from "./env";

export const auth = betterAuth({
  baseURL: env.BACKEND_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  plugins: [
    expo(),
    username(),
  ],
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: [
    "http://localhost:*",
    "http://127.0.0.1:*",
    "https://*.dev.vibecode.run",
    "https://*.vibecode.run",
    "https://*.vibecodeapp.com",
    "https://*.vibecode.dev",
    "https://vibecode.dev",
  ],
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
