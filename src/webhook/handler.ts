import { Webhooks } from '@octokit/webhooks'
import type { ConfirmChannel } from 'amqplib'
import { publishEvent } from '../amqp/publisher'
import { receivedCounter, publishedCounter, failedCounter } from '../metrics'

export interface WebhookHandlerConfig {
  secret: string
  channel: ConfirmChannel
  exchange: string
  namespace: string
  source: string
}

export function createWebhookHandler(config: WebhookHandlerConfig): Webhooks {
  const webhooks = new Webhooks({ secret: config.secret })

  webhooks.onAny(async ({ id, name, payload }) => {
    const action = 'action' in payload ? (payload.action as string) : undefined
    const repository
      = 'repository' in payload && payload.repository
        ? (payload.repository as { full_name: string }).full_name
        : undefined

    const labels = { event: name, action: action ?? '' }

    receivedCounter.inc(labels)

    try {
      await publishEvent({
        channel: config.channel,
        exchange: config.exchange,
        event: name,
        action,
        repository,
        payload: payload as Record<string, unknown>,
        namespace: config.namespace,
        source: config.source,
      })
      publishedCounter.inc(labels)
      console.log(
        `Published event: ${name}${action ? `.${action}` : ''}${repository ? ` (${repository})` : ''} [${id}]`,
      )
    }
    catch (err) {
      failedCounter.inc({ ...labels, reason: 'publish_error' })
      console.error(`Failed to publish event ${name} [${id}]:`, err)
    }
  })

  return webhooks
}
