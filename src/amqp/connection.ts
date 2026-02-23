import amqplib, { type ConfirmChannel } from 'amqplib'

export interface AMQPConfig {
  url: string
  exchange: string
  heartbeat: number
}

export interface AMQPConnection {
  connection: Awaited<ReturnType<typeof amqplib.connect>>
  channel: ConfirmChannel
  exchange: string
  close: () => Promise<void>
}

export async function createAMQPConnection(config: AMQPConfig): Promise<AMQPConnection> {
  let closing = false

  const connection = await amqplib.connect(config.url, { heartbeat: config.heartbeat })

  connection.on('error', (err) => {
    console.error('AMQP connection error:', err.message)
  })

  connection.on('close', () => {
    if (closing) return
    console.error('AMQP connection closed unexpectedly, triggering shutdown')
    process.kill(process.pid, 'SIGTERM')
  })

  const channel = await connection.createConfirmChannel()

  channel.on('error', (err) => {
    console.error('AMQP channel error:', err.message)
  })

  channel.on('close', () => {
    console.log('AMQP channel closed')
  })

  await channel.assertExchange(config.exchange, 'topic', {
    durable: true,
  })

  console.log(`AMQP connected and exchange '${config.exchange}' declared (topic, durable)`)

  return {
    connection,
    channel,
    exchange: config.exchange,
    close: async () => {
      closing = true
      try {
        await channel.close()
        await connection.close()
        console.log('AMQP connection closed gracefully')
      }
      catch (err) {
        console.error('Error closing AMQP connection:', err)
      }
    },
  }
}
