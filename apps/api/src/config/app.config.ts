import { registerAs } from "@nestjs/config";
import { z } from "zod";

const schema = z.object({
  port: z.coerce.number().default(3001),
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),
  betterAuthSecret: z.string().min(8),
  betterAuthUrl: z.string().url().default("http://localhost:3001"),
  frontendUrl: z.string().url().default("http://localhost:3000"),
  mobileScheme: z.string().default("flama"),
});

export const appConfig = registerAs("app", () => {
  return schema.parse({
    port: process.env.PORT,
    nodeEnv: process.env.NODE_ENV,
    betterAuthSecret: process.env.BETTER_AUTH_SECRET ?? process.env.JWT_SECRET,
    betterAuthUrl: process.env.BETTER_AUTH_URL,
    frontendUrl: process.env.FRONTEND_URL,
    mobileScheme: process.env.MOBILE_SCHEME,
  });
});
