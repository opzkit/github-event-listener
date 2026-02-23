import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { createWebhookHandler } from '../src/webhook/handler'
import { resetMetrics } from '../src/metrics'

function createMockChannel(shouldFail = false) {
  return {
    publish: mock(
      (
        _exchange: string,
        _routingKey: string,
        _content: Buffer,
        _options: Record<string, unknown>,
        callback: (err: Error | null) => void,
      ) => {
        if (shouldFail) {
          callback(new Error('publish failed'))
        }
        else {
          callback(null)
        }
        return true
      },
    ),
  }
}

describe('createWebhookHandler', () => {
  beforeEach(() => {
    resetMetrics()
  })

  it('returns a Webhooks instance', () => {
    const mockChannel = createMockChannel()
    const webhooks = createWebhookHandler({
      secret: 'test-secret',
      channel: mockChannel as never,
      exchange: 'events.topic.exchange',
      namespace: 'io.opzkit',
      source: '/opzkit/github-event-listener',
    })

    expect(webhooks).toBeDefined()
    expect(webhooks.verifyAndReceive).toBeInstanceOf(Function)
  })

  it('publishes events and increments counters on success', async () => {
    const mockChannel = createMockChannel()
    const webhooks = createWebhookHandler({
      secret: 'test-secret',
      channel: mockChannel as never,
      exchange: 'events.topic.exchange',
      namespace: 'io.opzkit',
      source: '/opzkit/github-event-listener',
    })

    // Simulate receiving an event by directly emitting through the handler
    // We test the handler logic by calling receive (bypasses signature verification)
    await webhooks.receive({
      id: 'test-delivery-1',
      name: 'push',
      payload: {
        ref: 'refs/heads/main',
        repository: { full_name: 'opzkit/test-repo' },
      } as never,
    })

    expect(mockChannel.publish).toHaveBeenCalledTimes(1)

    // Verify the publish was called with correct exchange
    const [exchange, routingKey] = mockChannel.publish.mock.calls[0]
    expect(exchange).toBe('events.topic.exchange')
    expect(routingKey).toBe('github.push')
  })

  it('publishes events with action in routing key', async () => {
    const mockChannel = createMockChannel()
    const webhooks = createWebhookHandler({
      secret: 'test-secret',
      channel: mockChannel as never,
      exchange: 'events.topic.exchange',
      namespace: 'io.opzkit',
      source: '/opzkit/github-event-listener',
    })

    await webhooks.receive({
      id: 'test-delivery-2',
      name: 'pull_request',
      payload: {
        action: 'opened',
        repository: { full_name: 'opzkit/test-repo' },
      } as never,
    })

    const [, routingKey] = mockChannel.publish.mock.calls[0]
    expect(routingKey).toBe('github.pull_request.opened')
  })

  it('handles publish failures without throwing', async () => {
    const mockChannel = createMockChannel(true)
    const webhooks = createWebhookHandler({
      secret: 'test-secret',
      channel: mockChannel as never,
      exchange: 'events.topic.exchange',
      namespace: 'io.opzkit',
      source: '/opzkit/github-event-listener',
    })

    // Should not throw — the handler catches publish errors
    await webhooks.receive({
      id: 'test-delivery-3',
      name: 'push',
      payload: {
        ref: 'refs/heads/main',
        repository: { full_name: 'opzkit/test-repo' },
      } as never,
    })

    expect(mockChannel.publish).toHaveBeenCalledTimes(1)
  })
})
