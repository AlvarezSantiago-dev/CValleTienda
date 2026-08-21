const hits = new Map<string, number[]>()

export function rateLimitOk(key: string, max: number, ventanaMs: number): boolean {
  const now = Date.now()
  const prev = (hits.get(key) ?? []).filter((t) => now - t < ventanaMs)
  if (prev.length >= max) {
    hits.set(key, prev)
    return false
  }
  prev.push(now)
  hits.set(key, prev)
  if (hits.size > 5000) {
    for (const [k, arr] of hits) {
      const keep = arr.filter((t) => now - t < ventanaMs)
      if (keep.length === 0) hits.delete(k)
      else hits.set(k, keep)
    }
  }
  return true
}
