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
    .default("false"),

  // Direct Gmail SMTP App Password Configuration
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.string().default("587"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_APP_PASSWORD: z.string().optional(),

  // Legacy Gmail API credentials (optional fallback)
  GMAIL_CLIENT_ID: z.string().optional(),
  GMAIL_CLIENT_SECRET: z.string().optional(),
  GMAIL_REFRESH_TOKEN: z.string().optional(),
  GMAIL_SENDER_EMAIL: z.string().optional().default("addytiwari3@gmail.com"),
  WEEKLY_REPORT_RECIPIENT_EMAIL: z.string().optional().default("addytiwari3@gmail.com,tiwariashwani5534@gmail.com"),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
  LOCAL_STORAGE_PATH: process.env.LOCAL_STORAGE_PATH,
  MOCK_EMAIL_DISPATCH: process.env.MOCK_EMAIL_DISPATCH,

  SMTP_HOST: process.env.SMTP_HOST || "smtp.gmail.com",
  SMTP_PORT: process.env.SMTP_PORT || "587",
  SMTP_USER: process.env.SMTP_USER || process.env.GMAIL_SENDER_EMAIL,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  SMTP_APP_PASSWORD: process.env.SMTP_APP_PASSWORD,

  GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET,
  GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN,
  GMAIL_SENDER_EMAIL: process.env.GMAIL_SENDER_EMAIL,
  WEEKLY_REPORT_RECIPIENT_EMAIL: process.env.WEEKLY_REPORT_RECIPIENT_EMAIL,
});
