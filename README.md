# github-event-listener

GitHub organization webhook listener that receives webhook events, wraps them in [CloudEvents](https://cloudevents.io/) format, and publishes them to a RabbitMQ topic exchange.

## How it works

```
GitHub webhook POST /webhook
  → Verify signature (HMAC-SHA256)
  → Wrap payload as CloudEvent
  → Publish to RabbitMQ topic exchange
      routing key: github.<event>[.<action>]
      type: <namespace>.<event>[.<action>].v1  (default namespace: io.opzkit)
```

## GitHub Webhook Setup

To configure the organization webhook in GitHub, see [Creating webhooks](https://docs.github.com/en/webhooks/using-webhooks/creating-webhooks) in the GitHub docs.

When creating the webhook, use these settings:

- **Payload URL**: `https://<your-domain>/webhook`
- **Content type**: `application/json`
- **Secret**: the same value as your `GITHUB_WEBHOOK_SECRET` environment variable
- **Events**: choose which events to subscribe to (or select "Send me everything")

## Setup

```bash
bun install
docker compose up -d  # RabbitMQ (management UI at localhost:15672)
```

## Configuration

| Variable | Required | Default |
|----------|----------|---------|
| `GITHUB_WEBHOOK_SECRET` | Yes | — |
| `AMQP_URL` | Yes | — |
| `AMQP_EXCHANGE` | No | `events.topic.exchange` |
| `AMQP_HEARTBEAT` | No | `10` |
| `PORT` | No | `8080` |
| `CLOUDEVENTS_NAMESPACE` | No | `io.opzkit` |
| `CLOUDEVENTS_SOURCE` | No | `/opzkit/github-event-listener` |

## Usage

```bash
bun run dev    # watch mode
bun run start  # production
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/webhook` | GitHub webhook receiver |
| `GET` | `/health` | Health check |
| `GET` | `/metrics` | Prometheus-compatible metrics |

## Development

```bash
bun test             # run tests
bun test --watch     # watch mode
bun run lint         # eslint
bun run typecheck    # tsc --noEmit
```

## Docker

```bash
docker build -t github-event-listener .
docker run -e GITHUB_WEBHOOK_SECRET=... -e AMQP_URL=... github-event-listener
```
