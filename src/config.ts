import { z } from 'zod/v4'

const configSchema = z.object({
  githubWebhookSecret: z.string(),
  amqpUrl: z.string(),
  amqpExchange: z.string().default('events.topic.exchange'),
  amqpHeartbeat: z.number().default(10),
  port: z.number().default(8080),
  cloudEventsNamespace: z.string().default('io.opzkit'),
  cloudEventsSource: z.string().default('/opzkit/github-event-listener'),
})

export type Config = z.infer<typeof configSchema>

export function loadConfig(): Config {
  return configSchema.parse({
    githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
    amqpUrl: process.env.AMQP_URL,
    amqpExchange: process.env.AMQP_EXCHANGE,
    amqpHeartbeat: process.env.AMQP_HEARTBEAT ? Number(process.env.AMQP_HEARTBEAT) : undefined,
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
    cloudEventsNamespace: process.env.CLOUDEVENTS_NAMESPACE,
    cloudEventsSource: process.env.CLOUDEVENTS_SOURCE,
  })
}
