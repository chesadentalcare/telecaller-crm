export interface Coalescer {
  schedule: () => void
  cancel: () => void
  readonly pending: boolean
}

export function createCoalescer(fn: () => void, waitMs: number): Coalescer {
  let timer: ReturnType<typeof setTimeout> | null = null
  return {
    schedule() {
      if (timer) return
      timer = setTimeout(() => {
        timer = null
        fn()
      }, waitMs)
    },
    cancel() {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    },
    get pending() {
      return timer !== null
    },
  }
}
