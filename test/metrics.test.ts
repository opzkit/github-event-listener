import { describe, it, expect, beforeEach } from 'bun:test'
import {
  receivedCounter,
  publishedCounter,
  failedCounter,
  getMetrics,
  resetMetrics,
} from '../src/metrics'

describe('metrics', () => {
  beforeEach(() => {
    resetMetrics()
  })

  describe('receivedCounter', () => {
    it('increments and serializes correctly', () => {
      receivedCounter.inc({ event: 'push', action: '' })
      receivedCounter.inc({ event: 'push', action: '' })
      receivedCounter.inc({ event: 'pull_request', action: 'opened' })

      const output = receivedCounter.serialize()
      expect(output).toContain('# HELP github_webhook_events_received_total')
      expect(output).toContain('# TYPE github_webhook_events_received_total counter')
      expect(output).toContain('github_webhook_events_received_total{event="push",action=""} 2')
      expect(output).toContain(
        'github_webhook_events_received_total{event="pull_request",action="opened"} 1',
      )
    })
  })

  describe('publishedCounter', () => {
    it('increments and serializes correctly', () => {
      publishedCounter.inc({ event: 'push', action: '' })

      const output = publishedCounter.serialize()
      expect(output).toContain('github_webhook_events_published_total{event="push",action=""} 1')
    })
  })

  describe('failedCounter', () => {
    it('includes reason label', () => {
      failedCounter.inc({ event: 'push', action: '', reason: 'publish_error' })

      const output = failedCounter.serialize()
      expect(output).toContain(
        'github_webhook_events_failed_total{event="push",action="",reason="publish_error"} 1',
      )
    })
  })

  describe('getMetrics', () => {
    it('returns empty-ish output when no metrics recorded', () => {
      const output = getMetrics()
      // Should just be a newline since no counters have data
      expect(output).toBe('\n')
    })

    it('returns combined output for all counters', () => {
      receivedCounter.inc({ event: 'push', action: '' })
      publishedCounter.inc({ event: 'push', action: '' })
      failedCounter.inc({ event: 'issues', action: 'opened', reason: 'publish_error' })

      const output = getMetrics()
      expect(output).toContain('github_webhook_events_received_total')
      expect(output).toContain('github_webhook_events_published_total')
      expect(output).toContain('github_webhook_events_failed_total')
    })
  })

  describe('resetMetrics', () => {
    it('clears all counters', () => {
      receivedCounter.inc({ event: 'push', action: '' })
      publishedCounter.inc({ event: 'push', action: '' })
      failedCounter.inc({ event: 'push', action: '', reason: 'publish_error' })

      resetMetrics()

      const output = getMetrics()
      expect(output).toBe('\n')
    })
  })
})
