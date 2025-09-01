import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, organization } from "better-auth/plugins";
import { db } from "../database/connection";
import * as schema from "../database/schema/index";
import { ENV } from "../../config/env";

if (!ENV.BETTER_AUTH_SECRET || ENV.BETTER_AUTH_SECRET === "development-fallback-secret-key") {
  console.warn("⚠️  BETTER_AUTH_SECRET not provided. Using development fallback.");
}

if (!ENV.BETTER_AUTH_URL || ENV.BETTER_AUTH_URL === "http://localhost:3001") {
  console.warn("⚠️  BETTER_AUTH_URL not provided. Using default localhost:3001.");
}

export const auth: any = db ? betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      twoFactor: schema.twoFactor,
    },
  }),
  secret: ENV.BETTER_AUTH_SECRET!,
  baseURL: ENV.BETTER_AUTH_URL!,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Disabled for testing
  },
  socialProviders: {
    google: {
      clientId: ENV.GOOGLE_CLIENT_ID as string,
      clientSecret: ENV.GOOGLE_CLIENT_SECRET as string,
      redirectURI: `${ENV.BETTER_AUTH_URL}/api/auth/callback/google`,
    },
    github: {
      clientId: ENV.GITHUB_CLIENT_ID as string,
      clientSecret: ENV.GITHUB_CLIENT_SECRET as string,
      redirectURI: `${ENV.BETTER_AUTH_URL}/api/auth/callback/github`,
    },
    microsoft: {
      clientId: ENV.MICROSOFT_CLIENT_ID as string,
      clientSecret: ENV.MICROSOFT_CLIENT_SECRET as string,
      redirectURI: `${ENV.BETTER_AUTH_URL}/api/auth/callback/microsoft`,
    },
    apple: {
      clientId: ENV.APPLE_CLIENT_ID as string,
      clientSecret: ENV.APPLE_CLIENT_SECRET as string,
      redirectURI: `${ENV.BETTER_AUTH_URL}/api/auth/callback/apple`,
    },
  },
  plugins: [
    admin(),
    organization({
      allowUserToCreateOrganization: true,
      organizationLimit: 5,
    }),
  ],
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  },
  user: {
    changeEmail: {
      enabled: true,
    },
    deleteUser: {
      enabled: true,
    },
  },
  rateLimit: {
    window: 10 * 60 * 1000, // 10 minutes
    max: 100, // max 100 requests per window per IP
  },
}) : {
  // Mock auth object when database is not available
  handler: (req: any, res: any) => {
    res.status(503).json({ error: "Database not configured" });
  },
  api: {
    getSession: () => Promise.resolve(null),
  },
};