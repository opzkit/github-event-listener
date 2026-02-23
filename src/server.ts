import type { Webhooks } from '@octokit/webhooks'
import { getMetrics } from './metrics'

export interface ServerConfig {
  port: number
  webhooks: Webhooks
}

export function startServer(config: ServerConfig) {
  return Bun.serve({
    port: config.port,
    async fetch(req) {
      const url = new URL(req.url)

      if (req.method === 'GET' && url.pathname === '/health') {
        return new Response('OK', { status: 200 })
      }

      if (req.method === 'GET' && url.pathname === '/metrics') {
        return new Response(getMetrics(), {
          status: 200,
          headers: { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' },
        })
      }

      if (req.method === 'POST' && url.pathname === '/webhook') {
        const id = req.headers.get('x-github-delivery') ?? ''
        const name = req.headers.get('x-github-event') ?? ''
        const signature = req.headers.get('x-hub-signature-256') ?? ''
        const body = await req.text()

        try {
          await config.webhooks.verifyAndReceive({
            id,
            name: name as Parameters<typeof config.webhooks.verifyAndReceive>[0]['name'],
            signature,
            payload: body,
          })
          return new Response('OK', { status: 200 })
        }
        catch (err) {
          console.error('Webhook verification/processing failed:', err)
          return new Response('Unauthorized', { status: 401 })
        }
      }

      return new Response('Not Found', { status: 404 })
    },
  })
}
