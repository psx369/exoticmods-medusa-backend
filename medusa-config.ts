import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "production", process.cwd())

// Resend is registered only when it is fully configured. The provider's
// validateOptions() throws on a missing api_key or from address, which would
// crash the container on boot -- so an unset env var degrades to Medusa's
// default notification module rather than taking the service down.
const resendEnabled = Boolean(
  process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL
)

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
  modules: resendEnabled
    ? [
        {
          resolve: "@medusajs/medusa/notification",
          options: {
            providers: [
              {
                resolve: "./src/modules/resend",
                id: "resend",
                options: {
                  channels: ["email"],
                  api_key: process.env.RESEND_API_KEY,
                  from: process.env.RESEND_FROM_EMAIL,
                },
              },
            ],
          },
        },
      ]
    : [],
})
