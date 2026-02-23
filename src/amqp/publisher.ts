import type { ConfirmChannel } from 'amqplib'
import { CloudEvent } from 'cloudevents'

export interface PublishOptions {
  channel: ConfirmChannel
  exchange: string
  event: string
  action?: string
  repository?: string
  payload: Record<string, unknown>
  namespace: string
  source: string
}

function buildRoutingKey(event: string, action?: string): string {
  return action ? `github.${event}.${action}` : `github.${event}`
}

function buildCloudEvent(
  event: string,
  action: string | undefined,
  repository: string | undefined,
  payload: Record<string, unknown>,
  namespace: string,
  source: string,
): CloudEvent<Record<string, unknown>> {
  const type = action
    ? `${namespace}.${event}.${action}.v1`
    : `${namespace}.${event}.v1`

  return new CloudEvent({
    specversion: '1.0',
    source,
    type,
    subject: repository,
    data: payload,
  })
}

export async function publishEvent(opts: PublishOptions): Promise<void> {
  const routingKey = buildRoutingKey(opts.event, opts.action)
  const cloudEvent = buildCloudEvent(opts.event, opts.action, opts.repository, opts.payload, opts.namespace, opts.source)
  const buffer = Buffer.from(JSON.stringify(cloudEvent))

  return new Promise((resolve, reject) => {
    opts.channel.publish(
      opts.exchange,
      routingKey,
      buffer,
      {
        persistent: true,
        contentType: 'application/cloudevents+json',
      },
      (err) => {
        if (err) {
          reject(err)
        }
        else {
          resolve()
        }
      },
    )
  })
}

export { buildRoutingKey, buildCloudEvent }
