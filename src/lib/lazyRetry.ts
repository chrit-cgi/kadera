import { lazy, type ComponentType } from 'react'

/**
 * Wraps React.lazy() with retry logic to recover from chunk-load failures
 * (e.g. after a deploy when old chunk hashes are no longer available).
 *
 * Retries up to `retries` times with `delay` ms between attempts.
 * On the final failure, forces a full page reload so the browser fetches
 * fresh chunk URLs.
 */
export function lazyRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
  retries = 3,
  delay = 1000,
): React.LazyExoticComponent<T> {
  return lazy(
    () =>
      new Promise<{ default: T }>((resolve, reject) => {
        const attempt = (retriesLeft: number) => {
          factory()
            .then(resolve)
            .catch((error: unknown) => {
              if (retriesLeft === 0) {
                // Last attempt — force reload to pick up new chunk URLs
                window.location.reload()
                reject(error)
                return
              }
              setTimeout(() => attempt(retriesLeft - 1), delay)
            })
        }
        attempt(retries)
      }),
  )
}
