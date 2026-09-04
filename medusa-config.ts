import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "production", process.cwd())

// Notification providers are registered only when fully configured. Each
// provider's validateOptions() throws on a missing option, which would crash
// the container on boot -- so an unset env var degrades gracefully instead of
// taking the service down.
const resendEnabled = Boolean(
  process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL
)

const mailchimpEnabled = Boolean(
  process.env.MAILCHIMP_API_KEY &&
  process.env.MAILCHIMP_SERVER &&
  process.env.MAILCHIMP_LIST_ID
)

// The notification module maps exactly one provider per channel
// (NotificationProviderService builds a Map keyed by channel, so a second
// provider on the same channel silently replaces the first). Resend owns
// "email" for transactional mail; Mailchimp owns "newsletter" for marketing.
const notificationProviders = [
  ...(resendEnabled
    ? [
        {
          resolve: "./src/modules/resend",
          id: "resend",
          options: {
            channels: ["email"],
            api_key: process.env.RESEND_API_KEY,
            from: process.env.RESEND_FROM_EMAIL,
          },
        },
      ]
    : []),
  ...(mailchimpEnabled
    ? [
        {
          resolve: "./src/modules/mailchimp",
          id: "mailchimp",
          options: {
            channels: ["newsletter"],
            apiKey: process.env.MAILCHIMP_API_KEY,
            server: process.env.MAILCHIMP_SERVER,
            listId: process.env.MAILCHIMP_LIST_ID,
            templates: {
              new_products: {
                subject_line: process.env.MAILCHIMP_NEW_PRODUCTS_SUBJECT_LINE,
                storefront_url: process.env.MAILCHIMP_NEW_PRODUCTS_STOREFRONT_URL,
              },
            },
          },
        },
      ]
    : []),
]

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    workerMode: (process.env.MEDUSA_WORKER_MODE as
      | "shared"
      | "worker"
      | "server") || "shared",
    http: {
      storeCors: process.env.STORE_CORS || "",
      adminCors: process.env.ADMIN_CORS || "",
      authCors: process.env.AUTH_CORS || "",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  admin: {
    // Leave empty so the admin Vite bundle uses same-origin relative URLs.
    // Setting an absolute fallback (e.g. http://localhost:9000) gets baked into
    // the bundle at `medusa build` time and breaks production logins with
    // "Failed to fetch" (mixed-content / cross-origin).
    backendUrl: process.env.BACKEND_URL || "",
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true",
  },
  modules: notificationProviders.length
    ? [
        {
          resolve: "@medusajs/medusa/notification",
          options: {
            providers: notificationProviders,
          },
        },
      ]
    : [],
})
