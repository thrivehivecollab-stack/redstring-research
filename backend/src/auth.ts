import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { expo } from "@better-auth/expo";
import { username, emailOTP } from "better-auth/plugins";
import { Resend } from "resend";
import { prisma } from "./prisma";
import { env } from "./env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export const auth = betterAuth({
  baseURL: env.BACKEND_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  plugins: [
    expo(),
    username(),
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        if (resend) {
          await resend.emails.send({
            from: env.EMAIL_FROM!,
            to: email,
            subject: "Your Red String verification code",
            html: `
              <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                <h2 style="color: #c0392b;">Red String Research</h2>
                <p>Your verification code is:</p>
                <h1 style="letter-spacing: 8px; color: #c0392b; font-size: 40px;">${otp}</h1>
                <p style="color: #666;">This code expires in 10 minutes. Do not share it with anyone.</p>
              </div>
            `,
          });
        } else {
          // Dev fallback: log OTP to backend console
          console.log(`\n🔑 [DEV OTP] Email: ${email} | Code: ${otp} | Type: ${type}\n`);
        }
      },
      expiresIn: 600, // 10 minutes
    }),
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
