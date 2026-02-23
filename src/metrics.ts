interface CounterKey {
  event: string
  action: string
  reason?: string
}

function keyToString(key: CounterKey, extra?: string): string {
  const parts = [key.event, key.action]
  if (extra) parts.push(extra)
  return parts.join(':')
}

class Counter {
  private name: string
  private help: string
  private labelNames: string[]
  private values = new Map<string, number>()
  private labelStore = new Map<string, CounterKey & { reason?: string }>()

  constructor(name: string, help: string, labelNames: string[]) {
    this.name = name
    this.help = help
    this.labelNames = labelNames
  }

  inc(labels: CounterKey & { reason?: string }): void {
    const key = keyToString(labels, labels.reason)
    this.values.set(key, (this.values.get(key) ?? 0) + 1)
    this.labelStore.set(key, labels)
  }

  serialize(): string {
    const lines: string[] = []
    lines.push(`# HELP ${this.name} ${this.help}`)
    lines.push(`# TYPE ${this.name} counter`)
    for (const [key, value] of this.values) {
      const labels = this.labelStore.get(key)!
      const labelParts = this.labelNames
        .filter(name => labels[name as keyof typeof labels] !== undefined)
        .map(name => `${name}="${labels[name as keyof typeof labels]}"`)
        .join(',')
      lines.push(`${this.name}{${labelParts}} ${value}`)
    }
    return lines.join('\n')
  }

  reset(): void {
    this.values.clear()
    this.labelStore.clear()
  }
}

export const receivedCounter = new Counter(
  'github_webhook_events_received_total',
  'Total received GitHub webhook events',
  ['event', 'action'],
)

export const publishedCounter = new Counter(
  'github_webhook_events_published_total',
  'Successfully published GitHub webhook events to RabbitMQ',
  ['event', 'action'],
)

export const failedCounter = new Counter(
  'github_webhook_events_failed_total',
  'Failed GitHub webhook events',
  ['event', 'action', 'reason'],
)

export function getMetrics(): string {
  const sections = [receivedCounter.serialize(), publishedCounter.serialize(), failedCounter.serialize()]
  return sections.filter(s => s.includes('{')).join('\n\n') + '\n'
}

export function resetMetrics(): void {
  receivedCounter.reset()
  publishedCounter.reset()
  failedCounter.reset()
}
