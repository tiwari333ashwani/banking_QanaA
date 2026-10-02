import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Daily Q&A Banking Platform"),

  STORAGE_PROVIDER: z.enum(["local", "gdrive"]).default("local"),
  LOCAL_STORAGE_PATH: z.string().default("./local_storage"),

  MOCK_EMAIL_DISPATCH: z
    .string()
    .transform((val) => val === "true" || val === "1")
    .default("true"),

  GMAIL_CLIENT_ID: z.string().optional(),
  GMAIL_CLIENT_SECRET: z.string().optional(),
  GMAIL_REFRESH_TOKEN: z.string().optional(),
  GMAIL_SENDER_EMAIL: z.string().optional().default("no-reply@bankingqa.local"),
  WEEKLY_REPORT_RECIPIENT_EMAIL: z.string().optional().default("user@bankingqa.local"),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
  LOCAL_STORAGE_PATH: process.env.LOCAL_STORAGE_PATH,
  MOCK_EMAIL_DISPATCH: process.env.MOCK_EMAIL_DISPATCH,
  GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET,
  GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN,
  GMAIL_SENDER_EMAIL: process.env.GMAIL_SENDER_EMAIL,
  WEEKLY_REPORT_RECIPIENT_EMAIL: process.env.WEEKLY_REPORT_RECIPIENT_EMAIL,
});
