import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { expo } from "@better-auth/expo";
import { username, phoneNumber } from "better-auth/plugins";
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
    phoneNumber({
      async sendOTP({ phoneNumber, code }) {
        if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER) {
          // Real SMS via Twilio
          const twilio = require("twilio");
          const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
          await client.messages.create({
            body: `Your Red String verification code: ${code}`,
            from: env.TWILIO_PHONE_NUMBER,
            to: phoneNumber,
          });
        } else {
          // Dev fallback: log OTP to backend console
          console.log(`\n[DEV OTP] Phone: ${phoneNumber} | Code: ${code}\n`);
        }
      },
      expiresIn: 600, // 10 minutes
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
