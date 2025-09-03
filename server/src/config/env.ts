import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
const result = config({ path: resolve(process.cwd(), ".env") });

if (result.error) {
  console.error("Failed to load .env file:", result.error);
} else {
  console.log("✅ Environment variables loaded successfully");
}

// Export environment variables with defaults
export const ENV = {
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "development-fallback-secret-key",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "http://localhost:3001",
  PORT: process.env.PORT || "3001",
  NODE_ENV: process.env.NODE_ENV || "development",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID,
  MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET,
  APPLE_CLIENT_ID: process.env.APPLE_CLIENT_ID,
  APPLE_CLIENT_SECRET: process.env.APPLE_CLIENT_SECRET,
  GENKIT_EXPORT_SECRET: process.env.GENKIT_EXPORT_SECRET,
};

console.log("Database configured:", !!ENV.DATABASE_URL);
console.log("Auth secret configured:", !!ENV.BETTER_AUTH_SECRET);
