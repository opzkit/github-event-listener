import { describe, it, expect, mock } from 'bun:test'
import { publishEvent, buildRoutingKey, buildCloudEvent } from '../src/amqp/publisher'

describe('buildRoutingKey', () => {
  it('returns github.<event> for events without action', () => {
    expect(buildRoutingKey('push')).toBe('github.push')
  })

  it('returns github.<event>.<action> for events with action', () => {
    expect(buildRoutingKey('pull_request', 'opened')).toBe('github.pull_request.opened')
  })

  it('handles create event', () => {
    expect(buildRoutingKey('create')).toBe('github.create')
  })

  it('handles issues with closed action', () => {
    expect(buildRoutingKey('issues', 'closed')).toBe('github.issues.closed')
  })
})

describe('buildCloudEvent', () => {
  it('creates a CloudEvent with correct type for event without action', () => {
    const ce = buildCloudEvent('push', undefined, 'opzkit/my-repo', { ref: 'refs/heads/main' }, 'io.opzkit', '/opzkit/github-event-listener')

    expect(ce.type).toBe('io.opzkit.push.v1')
    expect(ce.source).toBe('/opzkit/github-event-listener')
    expect(ce.subject).toBe('opzkit/my-repo')
    expect(ce.specversion).toBe('1.0')
    expect(ce.data).toEqual({ ref: 'refs/heads/main' })
  })

  it('creates a CloudEvent with correct type for event with action', () => {
    const ce = buildCloudEvent('pull_request', 'opened', 'opzkit/my-repo', {
      action: 'opened',
    }, 'io.opzkit', '/opzkit/github-event-listener')

    expect(ce.type).toBe('io.opzkit.pull_request.opened.v1')
    expect(ce.subject).toBe('opzkit/my-repo')
  })

  it('handles missing repository', () => {
    const ce = buildCloudEvent('ping', undefined, undefined, {}, 'io.opzkit', '/opzkit/github-event-listener')
    expect(ce.subject).toBeUndefined()
  })
})

describe('publishEvent', () => {
  it('publishes to the correct exchange and routing key with persistent flag', async () => {
    let publishedExchange = ''
    let publishedRoutingKey = ''
    let publishedOptions: Record<string, unknown> = {}
    let publishedBuffer: Buffer | null = null

    const mockChannel = {
      publish: mock(
        (
          exchange: string,
          routingKey: string,
          content: Buffer,
          options: Record<string, unknown>,
          callback: (err: Error | null) => void,
        ) => {
          publishedExchange = exchange
          publishedRoutingKey = routingKey
          publishedBuffer = content
          publishedOptions = options
          callback(null)
          return true
        },
      ),
    }

    await publishEvent({
      channel: mockChannel as never,
      exchange: 'events.topic.exchange',
      event: 'push',
      payload: { ref: 'refs/heads/main' },
      namespace: 'io.opzkit',
      source: '/opzkit/github-event-listener',
    })

    expect(publishedExchange).toBe('events.topic.exchange')
    expect(publishedRoutingKey).toBe('github.push')
    expect(publishedOptions.persistent).toBe(true)
    expect(publishedOptions.contentType).toBe('application/cloudevents+json')
    expect(publishedBuffer).not.toBeNull()

    const parsed = JSON.parse(publishedBuffer!.toString())
    expect(parsed.type).toBe('io.opzkit.push.v1')
  })

  it('publishes with action in routing key when present', async () => {
    let publishedRoutingKey = ''

    const mockChannel = {
      publish: mock(
        (
          _exchange: string,
          routingKey: string,
          _content: Buffer,
          _options: Record<string, unknown>,
          callback: (err: Error | null) => void,
        ) => {
          publishedRoutingKey = routingKey
          callback(null)
          return true
        },
      ),
    }

    await publishEvent({
      channel: mockChannel as never,
      exchange: 'events.topic.exchange',
      event: 'pull_request',
      action: 'opened',
      repository: 'opzkit/my-repo',
      payload: { action: 'opened' },
      namespace: 'io.opzkit',
      source: '/opzkit/github-event-listener',
    })

    expect(publishedRoutingKey).toBe('github.pull_request.opened')
  })

  it('rejects when channel.publish fails', async () => {
    const mockChannel = {
      publish: mock(
        (
          _exchange: string,
          _routingKey: string,
          _content: Buffer,
          _options: Record<string, unknown>,
          callback: (err: Error | null) => void,
        ) => {
          callback(new Error('publish failed'))
          return true
        },
      ),
    }

    await expect(
      publishEvent({
        channel: mockChannel as never,
        exchange: 'events.topic.exchange',
        event: 'push',
        payload: {},
        namespace: 'io.opzkit',
        source: '/opzkit/github-event-listener',
      }),
    ).rejects.toThrow('publish failed')
  })
})
