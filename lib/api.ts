import { getMockBaseline, mockAlerts, mockHistory, mockLatest, mockSpectrum, recordMockBaseline, type Baseline, type LatestReading, type MockAlert, type Zone, type Status } from './mock'

export type AlertRecord = MockAlert & { severity: Status }

const base = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, '')
const request = async <T,>(path: string, options?: RequestInit): Promise<T> => {
  if (!base) {
    if (path.includes('/latest')) return mockLatest() as T
    if (path.includes('/history')) return mockHistory(Number(new URLSearchParams(path.split('?')[1] ?? '').get('minutes') ?? 30)) as T
    if (path.includes('/spectrum')) return mockSpectrum((new URLSearchParams(path.split('?')[1] ?? '').get('zone') as Zone | null) ?? 'S2') as T
    if (path.includes('/alerts')) return mockAlerts() as T
    if (path.includes('/baseline/record')) return recordMockBaseline() as T
    return getMockBaseline() as T
  }
  const response = await fetch(`${base}${path}`, { ...options, cache: 'no-store' })
  if (!response.ok) {
    let detail = ''
    try {
      detail = await response.text()
    } catch {
      detail = ''
    }
    throw new Error(`Bridge API error: ${response.status}${detail ? `: ${detail.slice(0, 120)}` : ''}`)
  }
  return response.json() as Promise<T>
}
export const api = { latest: () => request<LatestReading>('/api/latest'), history: (minutes = 30) => request<LatestReading[]>(`/api/history?minutes=${minutes}`), alerts: () => request<AlertRecord[]>('/api/alerts'), baseline: () => request<Baseline>('/api/baseline'), spectrum: (zone: Zone) => request<{ frequency: number; magnitude: number }[]>(`/api/spectrum?zone=${zone}`), recordBaseline: () => request<Baseline>('/api/baseline/record', { method: 'POST' }) }
