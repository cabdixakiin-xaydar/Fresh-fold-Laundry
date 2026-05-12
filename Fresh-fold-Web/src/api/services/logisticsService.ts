import { apiList } from '../client'
import type { TripRow } from '../types'

export function listScheduledTrips(params?: { status?: string; q?: string; date?: string }): Promise<TripRow[]> {
  const query = new URLSearchParams()
  query.set('status', params?.status ?? 'scheduled')
  if (params?.q) query.set('q', params.q)
  if (params?.date) query.set('date', params.date)
  return apiList<TripRow>(`trips/?${query}`)
}
