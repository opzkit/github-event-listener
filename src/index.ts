import { loadConfig } from './config'
import { createAMQPConnection, type AMQPConnection } from './amqp/connection'
import { createWebhookHandler } from './webhook/handler'
import { startServer } from './server'

let amqp: AMQPConnection | null = null
let server: ReturnType<typeof startServer> | null = null

async function start() {
  console.log('Starting github-event-listener...')

  const config = loadConfig()

  amqp = await createAMQPConnection({
    url: config.amqpUrl,
    exchange: config.amqpExchange,
    heartbeat: config.amqpHeartbeat,
  })

  const webhooks = createWebhookHandler({
    secret: config.githubWebhookSecret,
    channel: amqp.channel,
    exchange: amqp.exchange,
    namespace: config.cloudEventsNamespace,
    source: config.cloudEventsSource,
  })

  server = startServer({
    port: config.port,
    webhooks,
  })

  console.log(`Server running at http://localhost:${server.port}`)
  console.log(`Webhook endpoint: POST http://localhost:${server.port}/webhook`)
  console.log(`Health check: GET http://localhost:${server.port}/health`)
  console.log(`Metrics: GET http://localhost:${server.port}/metrics`)
}

const shutdown = async () => {
  console.log('Shutting down...')

  if (server) {
    void server.stop()
  }

  if (amqp) {
    await amqp.close()
  }

  console.log('Shutdown complete')
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

start().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
