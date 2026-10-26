export type Zone = 'S1' | 'S2' | 'S3'
export type Status = 'NORMAL' | 'WARNING' | 'DANGER'

export type LatestReading = {
  timestamp: string
  s1_rms: number
  s2_rms: number
  s3_rms: number
  s1_freq: number
  s2_freq: number
  s3_freq: number
  load_kg: number
  deflection_mm: number
  status: Status
  affected_zone: Zone | null
  wifi_ok: boolean
}

export type BaselineZone = { f0: number; rms_mean: number; rms_std: number; recorded_at: string }
export type Baseline = Record<Lowercase<Zone>, BaselineZone>
export type MockAlert = {
  id: string
  timestamp: string
  severity: Status
  zone: Zone
  reason: string
  duration: string
  state: 'Active' | 'Clear'
}

const baseline: Baseline = {
  s1: { f0: 32.4, rms_mean: 0.041, rms_std: 0.008, recorded_at: '2026-10-24T14:32:00Z' },
  s2: { f0: 35.8, rms_mean: 0.052, rms_std: 0.011, recorded_at: '2026-10-24T14:32:00Z' },
  s3: { f0: 29.7, rms_mean: 0.038, rms_std: 0.007, recorded_at: '2026-10-24T14:32:00Z' },
}

let damage = false
export const setMockDamage = (value: boolean) => { damage = value }
export const getMockDamage = () => damage
export const getMockBaseline = () => baseline
export const recordMockBaseline = () => {
  const recorded_at = new Date().toISOString()
  Object.values(baseline).forEach((zone) => {
    zone.recorded_at = recorded_at
  })
  return baseline
}

export function mockAlerts(): MockAlert[] {
  return [
    { id: 'alert-1', timestamp: 'Today, 14:28:04', severity: 'WARNING', zone: 'S2', reason: 'Frequency down 7.3% vs baseline', duration: '00:42', state: 'Active' },
    { id: 'alert-2', timestamp: 'Today, 13:11:29', severity: 'DANGER', zone: 'S2', reason: 'RMS exceeded 2× warning level', duration: '01:18', state: 'Clear' },
    { id: 'alert-3', timestamp: 'Yesterday, 16:04:12', severity: 'WARNING', zone: 'S1', reason: 'RMS exceeded mean + 3σ', duration: '00:26', state: 'Clear' },
  ]
}

export function mockLatest(): LatestReading {
  const t = Date.now() / 1000
  const wobble = (n: number) => Math.sin(t / 7 + n) * 0.002 + Math.sin(t / 3 + n) * 0.001
  const d = damage ? Math.min(1, (t % 120) / 120) : 0
  const s2freq = baseline.s2.f0 * (1 - d * 0.13) + wobble(2)
  const s2rms = baseline.s2.rms_mean + wobble(2) + d * 0.09
  const warning = d > 0.18
  const danger = d > 0.72
  return { timestamp: new Date().toISOString(), s1_rms: baseline.s1.rms_mean + wobble(1) + d * 0.008, s2_rms: s2rms, s3_rms: baseline.s3.rms_mean + wobble(3) + d * 0.004, s1_freq: baseline.s1.f0 + wobble(1) * 5, s2_freq: s2freq, s3_freq: baseline.s3.f0 + wobble(3) * 5, load_kg: 1.8 + Math.sin(t / 9) * 0.15 + d * 1.8, deflection_mm: 0.84 + Math.sin(t / 8) * 0.06 + d * 1.5, status: danger ? 'DANGER' : warning ? 'WARNING' : 'NORMAL', affected_zone: warning ? 'S2' : null, wifi_ok: true }
}

export function mockHistory(minutes = 30) {
  const now = Date.now()
  return Array.from({ length: Math.min(minutes * 2, 60) }, (_, i) => {
    const reading = mockLatest()
    return { ...reading, timestamp: new Date(now - (60 - i) * 30000).toISOString() }
  })
}

export function mockSpectrum(zone: Zone) {
  const center = baseline[zone.toLowerCase() as keyof Baseline].f0
  return Array.from({ length: 51 }, (_, i) => { const frequency = i * 2; const peak = Math.exp(-((frequency - center) ** 2) / 18) * 0.9; return { frequency, magnitude: 0.08 + Math.abs(Math.sin(i * 2.1)) * 0.035 + peak } })
}
