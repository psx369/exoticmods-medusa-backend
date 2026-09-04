import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"

export default async function newsletterSignupHandler({
  event: { data },
  container,
}: SubscriberArgs<{ email: string, first_name: string, last_name: string }>) {
  const notificationModuleService = container.resolve("notification")

  await notificationModuleService.createNotifications({
    // "newsletter", not "email": the notification module maps one provider per
    // channel, so putting Mailchimp on "email" would silently displace the
    // Resend provider that sends order confirmations.
    channel: "newsletter",
    to: data.email,
    template: "newsletter-signup",
    data: {
      first_name: data.first_name,
      last_name: data.last_name,
    },
  })
}

export const config: SubscriberConfig = {
  event: `newsletter.signup`,
}
