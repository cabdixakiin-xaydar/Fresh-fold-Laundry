/** Match backend `orders.utils.normalize_order_number` for routing and API calls. */
export function normalizeOrderNumber(raw: string): string {
  return raw.trim().replace(/^#/, '').trim().replace(/\s+/g, '')
}
