// auth v3 - phone OTP + social
import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { expo } from "@better-auth/expo";
import { username, phoneNumber } from "better-auth/plugins";
import { prisma } from "./prisma";
import { env } from "./env";

export let lastDevOtp: { phone: string; code: string } | null = null;

export const auth = betterAuth({
  baseURL: env.BACKEND_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  socialProviders: {
    ...(env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET ? {
      apple: {
        clientId: env.APPLE_CLIENT_ID,
        clientSecret: env.APPLE_CLIENT_SECRET,
      },
    } : {}),
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    } : {}),
  },
  plugins: [
    expo(),
    username(),
    phoneNumber({
      async sendOTP({ phoneNumber, code }) {
        if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER) {
          const twilio = require("twilio");
          const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
          await client.messages.create({
            body: `Your Red String verification code: ${code}`,
            from: env.TWILIO_PHONE_NUMBER,
            to: phoneNumber,
          });
        } else {
          lastDevOtp = { phone: phoneNumber, code };
          console.log(`\n[DEV OTP] Phone: ${phoneNumber} | Code: ${code}\n`);
        }
      },
      signUpOnVerification: {
        getTempEmail: (phone) => `${phone.replace(/\+/g, "").replace(/\s/g, "")}@phone.redstring.app`,
        getTempName: (phone) => phone,
      },
      expiresIn: 600,
      otpLength: 6,
    }),
  ],
  emailAndPassword: {
    enabled: false,
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
