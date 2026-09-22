import type { Instrumentation } from 'next'
import { inspect } from 'node:util'

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context
) => {
  const error = err instanceof Error ? err : new Error(String(err))
  const digest =
    typeof err === 'object' && err !== null && 'digest' in err
      ? String((err as { digest?: unknown }).digest)
      : undefined

  // 一条结构化日志，方便 grep / 采集
  console.error(
    JSON.stringify({
      level: 'error',
      source: 'next.onRequestError',
      message: error.message,
      name: error.name,
      digest,
      stack: error.stack,
      path: request.path,
      method: request.method,
      routerKind: context.routerKind,   // 'App Router' | 'Pages Router'
      routePath: context.routePath,     // 如 /app/blog/[slug]
      routeType: context.routeType,     // 'render' | 'route' | 'action' | ...
      renderSource: context.renderSource,
    })
  )

  // 开发时想看完整对象可以用 inspect
  if (process.env.NODE_ENV !== 'production') {
    console.error(inspect({ err, request, context }, { depth: 6, colors: true }))
  }
}
  