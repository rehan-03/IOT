'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  CircleHelp,
  LayoutDashboard,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Waves,
  Wifi,
  XCircle,
} from 'lucide-react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api, type AlertRecord } from '@/lib/api'
import { getMockDamage, setMockDamage, type Baseline, type LatestReading, type Zone } from '@/lib/mock'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const zones: Zone[] = ['S1', 'S2', 'S3']
const colors = { S1: '#2F7F86', S2: '#C2622D', S3: '#7A8B3C' }
const nav = [
  { label: 'Live', icon: LayoutDashboard },
  { label: 'Trends', icon: Activity },
  { label: 'Spectrum', icon: Waves },
  { label: 'Alerts', icon: Bell },
  { label: 'Baseline', icon: ShieldCheck },
]
const fmt = (value: number, digits = 2) => value.toFixed(digits)
const zoneKey = (zone: Zone) => zone.toLowerCase() as 's1' | 's2' | 's3'

function StatusBadge({ status }: { status: LatestReading['status'] }) {
  const Icon = status === 'NORMAL' ? CheckCircle2 : status === 'WARNING' ? AlertTriangle : XCircle
  const tone = status === 'NORMAL' ? 'bg-[#E6F0E4] text-[#3F7D4E]' : status === 'WARNING' ? 'bg-[#FBF0D5] text-[#9a680b]' : 'bg-[#F6DDD7] text-[#B3412F]'
  return <Badge className={`gap-1 border-0 ${tone}`}><Icon aria-hidden="true" className="size-3.5" />{status}</Badge>
}

function Metric({ label, value, unit, detail }: { label: string; value: string; unit: string; detail?: string }) {
  return <Card className="border-[#E8DFCB] bg-[#FFFDF7] shadow-[0_2px_12px_rgba(94,72,42,0.04)]"><CardContent className="p-4"><p className="text-xs font-medium uppercase tracking-[0.12em] text-[#7A7266]">{label}</p><div className="mt-2 flex items-baseline gap-1"><span className="font-mono text-2xl font-semibold tracking-tight text-[#2E2A24]">{value}</span><span className="font-mono text-xs text-[#7A7266]">{unit}</span></div>{detail && <p className="mt-1 text-xs text-[#7A7266]">{detail}</p>}</CardContent></Card>
}

function ChartCard({ title, children, caption }: { title: string; children: React.ReactNode; caption?: string }) {
  return <Card className="border-[#E8DFCB] bg-[#FFFDF7]"><CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle>{caption && <p className="text-xs text-[#7A7266]">{caption}</p>}</CardHeader><CardContent className="h-[260px] pr-5">{children}</CardContent></Card>
}

function BridgeSchematic({ latest }: { latest: LatestReading }) {
  const values = { S1: latest.s1_rms, S2: latest.s2_rms, S3: latest.s3_rms }
  return <Card className="border-[#E8DFCB] bg-[#FFFDF7]"><CardHeader className="flex-row items-center justify-between pb-0"><CardTitle className="text-base">Bridge instrumentation</CardTitle><span className="text-xs text-[#7A7266]">50–60 cm truss model</span></CardHeader><CardContent className="pt-3"><svg viewBox="0 0 820 230" className="w-full" role="img" aria-label="Truss bridge schematic with three sensors"><path d="M75 168 L745 168 M75 168 L140 60 L220 168 L300 60 L380 168 L460 60 L540 168 L620 60 L745 168 M75 168 L140 60 M140 60 L300 60 M300 60 L460 60 M460 60 L620 60 M620 60 L745 168" fill="none" stroke="#C7B99F" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/><path d="M75 184 L745 184" stroke="#E8DFCB" strokeWidth="3"/>{(['S1', 'S2', 'S3'] as Zone[]).map((zone, index) => { const x = 210 + index * 200; return <g key={zone}><circle cx={x} cy="136" r="11" fill={colors[zone]} stroke="#FFFDF7" strokeWidth="5"/><text x={x - 20} y="116" fontFamily="Inter, sans-serif" fontSize="15" fontWeight="600" fill="#2E2A24">{zone}</text><text x={x - 33} y="214" fontFamily="monospace" fontSize="12" fill="#7A7266">{fmt(values[zone], 3)} g</text></g> })}<path d="M410 60 V25" stroke="#C2622D" strokeWidth="2" strokeDasharray="4 4"/><circle cx="410" cy="20" r="9" fill="#C2622D"/><text x="430" y="24" fontFamily="Inter" fontSize="12" fill="#7A7266">Ultrasonic · {fmt(latest.deflection_mm)} mm</text><path d="M410 184 V205" stroke="#2F7F86" strokeWidth="2" strokeDasharray="4 4"/><circle cx="410" cy="211" r="7" fill="#2F7F86"/><text x="430" y="216" fontFamily="Inter" fontSize="12" fill="#7A7266">Load cell · {fmt(latest.load_kg)} kg</text></svg><div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#7A7266]"><span><i className="mr-1.5 inline-block size-2 rounded-full bg-[#2F7F86]" />RMS within threshold</span><span><i className="mr-1.5 inline-block size-2 rounded-full bg-[#C2622D]" />Active measurement</span><span>Threshold: mean + 3σ</span></div></CardContent></Card>
}

export default function BridgeDashboard() {
  const [tab, setTab] = useState('Live')
  const [latest, setLatest] = useState<LatestReading>()
  const [history, setHistory] = useState<LatestReading[]>([])
  const [baseline, setBaseline] = useState<Baseline>()
  const [alerts, setAlerts] = useState<AlertRecord[]>([])
  const [spectrum, setSpectrum] = useState<{ frequency: number; magnitude: number }[]>([])
  const [damage, setDamage] = useState(getMockDamage())
  const [range, setRange] = useState(30)
  const [zone, setZone] = useState<Zone>('S2')
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [updatedAt, setUpdatedAt] = useState<Date>()
  const [savingBaseline, setSavingBaseline] = useState(false)

  const loadTelemetry = useCallback(async () => {
    try {
      setLoading(true)
      setError(undefined)
      const [reading, readings, reference] = await Promise.all([api.latest(), api.history(range), api.baseline()])
      setLatest(reading)
      setHistory(readings)
      setBaseline(reference)
      setUpdatedAt(new Date())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load bridge telemetry.')
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    void loadTelemetry()
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadTelemetry()
    }, 5000)
    return () => window.clearInterval(id)
  }, [loadTelemetry])

  useEffect(() => {
    if (tab !== 'Spectrum') return
    let active = true
    void api.spectrum(zone).then((value) => {
      if (active) setSpectrum(value)
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Unable to load spectrum data.')
    })
    return () => { active = false }
  }, [tab, zone])

  useEffect(() => {
    if (tab !== 'Alerts') return
    let active = true
    void api.alerts().then((value) => {
      if (active) setAlerts(value)
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Unable to load alerts.')
    })
    return () => { active = false }
  }, [tab, latest?.status])

  const data = useMemo(() => history.map((reading) => ({ ...reading, time: new Date(reading.timestamp).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }), s1: reading.s1_freq, s2: reading.s2_freq, s3: reading.s3_freq, rms1: reading.s1_rms, rms2: reading.s2_rms, rms3: reading.s3_rms })), [history])

  if (loading && (!latest || !baseline)) return <div className="flex min-h-screen items-center justify-center bg-[#FAF5E9] text-[#7A7266]"><RefreshCw className="mr-2 size-4 animate-spin" /> Connecting to bridge telemetry…</div>
  if (!latest || !baseline) return <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#FAF5E9] text-[#7A7266]"><p>{error ?? 'Bridge telemetry is unavailable.'}</p><Button onClick={() => void loadTelemetry()} className="bg-[#C2622D] text-white hover:bg-[#A94E22]"><RefreshCw className="mr-2 size-4" />Retry</Button></div>

  const connection = updatedAt && Date.now() - updatedAt.getTime() < 5000 ? 'Connected' : 'Delayed'
  const threshold = baseline.s2.rms_mean + baseline.s2.rms_std * 3
  const record = async () => {
    try {
      setSavingBaseline(true)
      setBaseline(await api.recordBaseline())
      setConfirm(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to record baseline.')
    } finally {
      setSavingBaseline(false)
    }
  }

  const navigation = (compact = false) => <nav aria-label="Dashboard sections" className={compact ? 'grid grid-cols-5 gap-1' : 'flex flex-col gap-1'}>{nav.map(({ label, icon: Icon }) => <button key={label} type="button" onClick={() => setTab(label)} aria-current={tab === label ? 'page' : undefined} className={`${compact ? 'flex flex-col items-center gap-1 rounded-lg py-1 text-[10px]' : 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm'} transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2622D] focus-visible:ring-offset-2 ${tab === label ? 'bg-[#F7E7DA] font-semibold text-[#A94E22]' : 'text-[#7A7266] hover:bg-[#FAF5E9] hover:text-[#2E2A24]'}`}><Icon aria-hidden="true" className="size-4" />{label}{label === 'Alerts' && alerts.length > 0 && <span className={compact ? 'sr-only' : 'ml-auto rounded-full bg-[#F6DDD7] px-1.5 py-0.5 text-[10px] text-[#B3412F]'}>{alerts.length} alerts</span>}</button>)}</nav>
  return <TooltipProvider><div className="min-h-screen bg-[#FAF5E9] text-[#2E2A24]"><aside className="fixed inset-y-0 left-0 z-20 hidden w-[230px] border-r border-[#E8DFCB] bg-[#FFFDF7] px-4 py-5 lg:block"><div className="flex items-center gap-3 px-3"><div className="flex size-9 items-center justify-center rounded-xl bg-[#C2622D] text-white"><Activity aria-hidden="true" className="size-5" /></div><div><p className="font-semibold tracking-tight">BridgeWatch</p><p className="text-[10px] uppercase tracking-[0.16em] text-[#7A7266]">Structural health</p></div></div><Separator className="my-7 bg-[#E8DFCB]" />{navigation()}<div className="absolute bottom-5 left-4 right-4 rounded-xl border border-[#E8DFCB] bg-[#FAF5E9] p-3"><div className="flex items-center gap-2 text-xs font-semibold"><Wifi aria-hidden="true" className="size-3.5 text-[#3F7D4E]" /> Sensor gateway</div><p className="mt-1 pl-5 text-[11px] text-[#7A7266]">ESP32 · Wi-Fi stable</p></div></aside><main className="lg:pl-[230px]"><header className="sticky top-0 z-10 flex min-h-[72px] items-center justify-between gap-3 border-b border-[#E8DFCB] bg-[#FAF5E9]/95 px-5 py-3 backdrop-blur md:px-8"><div><p className="text-sm font-semibold">{tab === 'Live' ? 'Live overview' : tab}</p><p className="text-xs text-[#7A7266]">Popsicle-stick truss · Lab 04</p></div><div className="flex items-center gap-3"><div className="hidden items-center gap-2 text-xs text-[#7A7266] sm:flex" aria-live="polite"><span aria-hidden="true" className={`size-2 rounded-full ${connection === 'Connected' ? 'bg-[#3F7D4E]' : 'bg-[#C98A12]'}`} />{connection}<span aria-hidden="true" className="text-[#B2A895]">·</span>{updatedAt ? `Updated ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Updating…'}</div>{!process.env.NEXT_PUBLIC_API_BASE && <label className="hidden items-center gap-2 text-xs font-medium text-[#7A7266] sm:flex">Simulate damage <Switch checked={damage} onCheckedChange={(value) => { setDamage(value); setMockDamage(value) }} aria-label="Simulate bridge damage" /></label>}<Button variant="ghost" size="icon" className="text-[#7A7266]" onClick={() => void loadTelemetry()} aria-label="Refresh telemetry"><RefreshCw aria-hidden="true" className={loading ? 'animate-spin' : ''} /></Button><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="text-[#7A7266]" aria-label="Project settings"><Settings2 aria-hidden="true" /></Button></TooltipTrigger><TooltipContent>Project settings are managed by the API configuration.</TooltipContent></Tooltip></div></header><div className="mx-auto max-w-[1400px] px-5 pb-24 pt-7 md:px-8 lg:pb-10">{error && <div role="alert" className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-[#E3B6AC] bg-[#F6DDD7] px-4 py-3 text-sm text-[#8f3527]"><span>{error}</span><Button variant="ghost" size="sm" onClick={() => setError(undefined)}>Dismiss</Button></div>}{tab === 'Live' && <LiveView latest={latest} baseline={baseline} />}{tab === 'Trends' && <TrendsView data={data} baseline={baseline} threshold={threshold} range={range} setRange={setRange} />}{tab === 'Spectrum' && <SpectrumView zone={zone} setZone={setZone} baseline={baseline} spectrum={spectrum} />}{tab === 'Alerts' && <AlertsView alerts={alerts} />}{tab === 'Baseline' && <BaselineView baseline={baseline} confirm={confirm} setConfirm={setConfirm} record={record} saving={savingBaseline} />}</div><nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[#E8DFCB] bg-[#FFFDF7] px-2 py-2 lg:hidden">{navigation(true)}</nav></main></div></TooltipProvider>
}

function LiveView({ latest, baseline }: { latest: LatestReading; baseline: Baseline }) {
  return <div className="flex flex-col gap-5"><div className={`flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${latest.status === 'NORMAL' ? 'border-[#BFD5BD] bg-[#E6F0E4]' : latest.status === 'WARNING' ? 'border-[#E8D39B] bg-[#FBF0D5]' : 'border-[#E3B6AC] bg-[#F6DDD7]'}`}><div className="flex items-center gap-4"><div className={`flex size-11 items-center justify-center rounded-xl ${latest.status === 'NORMAL' ? 'bg-[#3F7D4E] text-white' : latest.status === 'WARNING' ? 'bg-[#C98A12] text-white' : 'bg-[#B3412F] text-white'}`}>{latest.status === 'NORMAL' ? <CheckCircle2 /> : <AlertTriangle />}</div><div><div className="flex items-center gap-2"><h1 className="text-lg font-semibold">Bridge status</h1><StatusBadge status={latest.status} /></div><p className="mt-1 text-sm text-[#665d51]">{latest.status === 'NORMAL' ? 'All monitored signals are within healthy baseline ranges.' : `S2 frequency down ${fmt((1 - latest.s2_freq / baseline.s2.f0) * 100, 1)}% vs baseline.`}</p></div></div><div className="text-left sm:text-right"><p className="text-xs text-[#7A7266]">Abnormal readings</p><p className="font-mono text-lg font-semibold">{latest.status === 'NORMAL' ? '0 / 2' : '2 / 2'}</p></div></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"><Metric label="Applied load" value={fmt(latest.load_kg)} unit="kg" detail="Load cell · live" /><Metric label="Deflection" value={fmt(latest.deflection_mm)} unit="mm" detail="Ultrasonic sensor · live" />{zones.map((zone) => { const key = zoneKey(zone); return <Metric key={zone} label={`${zone} dominant frequency`} value={fmt(latest[`${key}_freq`], 1)} unit="Hz" detail={`${fmt((1 - latest[`${key}_freq`] / baseline[key].f0) * 100, 1)}% shift from baseline`} /> })}</div><div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]"><BridgeSchematic latest={latest} /><Card className="border-[#E8DFCB] bg-[#FFFDF7]"><CardHeader><CardTitle className="text-base">Vibration RMS</CardTitle><p className="text-xs text-[#7A7266]">Acceleration amplitude by sensor zone</p></CardHeader><CardContent className="flex flex-col gap-4">{zones.map((zone) => { const key = zoneKey(zone); const value = latest[`${key}_rms`]; const reference = baseline[key]; return <div key={zone}><div className="mb-1.5 flex items-center justify-between text-xs"><span className="font-semibold">{zone} <span className="font-normal text-[#7A7266]">· warning at {fmt(reference.rms_mean + reference.rms_std * 3, 3)} g</span></span><span className="font-mono">{fmt(value, 3)} g</span></div><div className="h-2 rounded-full bg-[#F0E9DC]"><div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(100, value / (reference.rms_mean + reference.rms_std * 3) * 100)}%`, backgroundColor: colors[zone] }} /></div></div> })}<div className="mt-2 flex items-center gap-2 rounded-lg bg-[#FAF5E9] p-3 text-xs text-[#7A7266]"><CircleHelp className="size-4 shrink-0 text-[#C2622D]" /> Healthy thresholds are calibrated to the recorded baseline.</div></CardContent></Card></div></div>
}

function TrendsView({ data, baseline, threshold, range, setRange }: { data: Array<LatestReading & { time: string; s1: number; s2: number; s3: number; rms1: number; rms2: number; rms3: number }>; baseline: Baseline; threshold: number; range: number; setRange: (value: number) => void }) {
  return <div className="flex flex-col gap-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-semibold">Signal trends</h1><p className="text-sm text-[#7A7266]">Telemetry history and baseline comparison</p></div><div className="flex rounded-lg border border-[#E8DFCB] bg-[#FFFDF7] p-1">{[5, 30, 120].map((value) => <button key={value} onClick={() => setRange(value)} className={`rounded-md px-3 py-1.5 text-xs ${range === value ? 'bg-[#F7E7DA] font-semibold text-[#A94E22]' : 'text-[#7A7266]'}`}>{value < 60 ? `${value} min` : '2 h'}</button>)}</div></div><div className="grid gap-5 xl:grid-cols-2"><ChartCard title="Dominant frequency" caption="Baseline comparison"><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><CartesianGrid stroke="#E8DFCB" vertical={false} /><XAxis dataKey="time" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} /><RechartsTooltip /><ReferenceLine y={baseline.s2.f0} stroke="#7A7266" strokeDasharray="5 5" /><Line dataKey="s1" stroke={colors.S1} dot={false} strokeWidth={2} /><Line dataKey="s2" stroke={colors.S2} dot={false} strokeWidth={2} /><Line dataKey="s3" stroke={colors.S3} dot={false} strokeWidth={2} /></LineChart></ResponsiveContainer></ChartCard><ChartCard title="Vibration RMS" caption="Warning threshold = mean + 3σ"><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><CartesianGrid stroke="#E8DFCB" vertical={false} /><XAxis dataKey="time" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><RechartsTooltip /><ReferenceLine y={threshold} stroke="#7A7266" strokeDasharray="5 5" /><Line dataKey="rms1" stroke={colors.S1} dot={false} strokeWidth={2} /><Line dataKey="rms2" stroke={colors.S2} dot={false} strokeWidth={2} /><Line dataKey="rms3" stroke={colors.S3} dot={false} strokeWidth={2} /></LineChart></ResponsiveContainer></ChartCard></div><ChartCard title="Load, deflection and S2 RMS" caption="Correlated response across shared time axis"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={data}><CartesianGrid stroke="#E8DFCB" vertical={false} /><XAxis dataKey="time" tick={{ fontSize: 10 }} /><YAxis yAxisId="left" tick={{ fontSize: 10 }} /><YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} /><RechartsTooltip /><Area yAxisId="left" dataKey="load_kg" fill="#F7E7DA" stroke="#C2622D" fillOpacity={0.6} /><Line yAxisId="left" dataKey="deflection_mm" stroke="#7A8B3C" dot={false} strokeWidth={2} /><Line yAxisId="right" dataKey="rms2" stroke="#2F7F86" dot={false} strokeWidth={2} /></ComposedChart></ResponsiveContainer></ChartCard></div>
}

function SpectrumView({ zone, setZone, baseline, spectrum }: { zone: Zone; setZone: (zone: Zone) => void; baseline: Baseline; spectrum: { frequency: number; magnitude: number }[] }) {
  const reference = baseline[zoneKey(zone)]
  return <div className="flex flex-col gap-5"><div><h1 className="text-xl font-semibold">Frequency spectrum</h1><p className="text-sm text-[#7A7266]">FFT magnitude across the monitored bridge</p></div><div className="flex gap-2">{zones.map((item) => <button key={item} onClick={() => setZone(item)} className={`rounded-lg border px-4 py-2 text-sm ${zone === item ? 'border-[#C2622D] bg-[#F7E7DA] font-semibold text-[#A94E22]' : 'border-[#E8DFCB] bg-[#FFFDF7] text-[#7A7266]'}`}>{item} sensor</button>)}</div><ChartCard title={`${zone} FFT magnitude`} caption={`Dominant peak near ${fmt(reference.f0, 1)} Hz · range 0–100 Hz`}><ResponsiveContainer width="100%" height="100%"><ComposedChart data={spectrum}><CartesianGrid stroke="#E8DFCB" vertical={false} /><XAxis dataKey="frequency" tick={{ fontSize: 10 }} label={{ value: 'Hz', position: 'insideBottomRight', offset: -5, fontSize: 11 }} /><YAxis tick={{ fontSize: 10 }} /><RechartsTooltip /><Area dataKey="magnitude" fill="#F7E7DA" stroke="#C2622D" fillOpacity={0.8} /><ReferenceLine x={reference.f0} stroke="#C2622D" strokeDasharray="5 5" label={{ value: 'peak', fill: '#C2622D', fontSize: 11 }} /></ComposedChart></ResponsiveContainer></ChartCard></div>
}

function AlertsView({ alerts }: { alerts: AlertRecord[] }) {
  return <div className="flex flex-col gap-5"><div><h1 className="text-xl font-semibold">Alert history</h1><p className="text-sm text-[#7A7266]">Review abnormal readings and resolution state</p></div><Card className="overflow-x-auto border-[#E8DFCB] bg-[#FFFDF7]"><Table><TableHeader><TableRow><TableHead>Timestamp</TableHead><TableHead>Severity</TableHead><TableHead>Zone</TableHead><TableHead>Reason</TableHead><TableHead>Duration</TableHead><TableHead>State</TableHead></TableRow></TableHeader><TableBody>{alerts.length === 0 ? <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-[#7A7266]">No alerts recorded.</TableCell></TableRow> : alerts.map((alert) => <TableRow key={alert.id}><TableCell className="font-mono text-xs">{alert.timestamp}</TableCell><TableCell><StatusBadge status={alert.severity} /></TableCell><TableCell className="font-semibold">{alert.zone}</TableCell><TableCell className="text-sm text-[#665d51]">{alert.reason}</TableCell><TableCell className="font-mono text-xs">{alert.duration}</TableCell><TableCell><span className={`text-xs font-medium ${alert.state === 'Active' ? 'text-[#B3412F]' : 'text-[#7A7266]'}`}>{alert.state}</span></TableCell></TableRow>)}</TableBody></Table></Card></div>
}

function BaselineView({ baseline, confirm, setConfirm, record, saving }: { baseline: Baseline; confirm: boolean; setConfirm: (value: boolean) => void; record: () => void; saving: boolean }) {
  return <div className="flex flex-col gap-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-xl font-semibold">Healthy baseline</h1><p className="text-sm text-[#7A7266]">Reference values used to calculate structural change</p></div><Dialog open={confirm} onOpenChange={setConfirm}><DialogTrigger asChild><Button className="bg-[#C2622D] text-white hover:bg-[#A94E22]"><RefreshCw data-icon="inline-start" />Record healthy baseline</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Record a new baseline?</DialogTitle><DialogDescription>Make sure the bridge is unloaded and vibration-free. This will replace the current reference values for all zones.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button><Button disabled={saving} onClick={record} className="bg-[#C2622D] text-white">{saving ? 'Recording…' : 'Record baseline'}</Button></DialogFooter></DialogContent></Dialog></div><div className="grid gap-4 md:grid-cols-3">{zones.map((zone) => { const reference = baseline[zoneKey(zone)]; return <Card key={zone} className="border-[#E8DFCB] bg-[#FFFDF7]"><CardHeader className="pb-3"><CardTitle className="flex items-center justify-between text-base"><span>{zone} sensor</span><span className="size-2.5 rounded-full" style={{ backgroundColor: colors[zone] }} /></CardTitle></CardHeader><CardContent className="grid grid-cols-3 gap-3"><div><p className="text-[10px] uppercase tracking-wider text-[#7A7266]">f0</p><p className="mt-1 font-mono text-lg">{fmt(reference.f0, 1)}<small className="ml-1 text-xs text-[#7A7266]">Hz</small></p></div><div><p className="text-[10px] uppercase tracking-wider text-[#7A7266]">RMS μ</p><p className="mt-1 font-mono text-lg">{fmt(reference.rms_mean, 3)}</p></div><div><p className="text-[10px] uppercase tracking-wider text-[#7A7266]">RMS σ</p><p className="mt-1 font-mono text-lg">{fmt(reference.rms_std, 3)}</p></div><p className="col-span-3 border-t border-[#E8DFCB] pt-3 text-xs text-[#7A7266]">Recorded {new Date(reference.recorded_at).toLocaleString()}</p></CardContent></Card> })}</div><div className="flex items-start gap-3 rounded-xl border border-[#E8DFCB] bg-[#FBF0D5] p-4 text-sm text-[#665d51]"><CircleHelp className="mt-0.5 size-4 shrink-0 text-[#C98A12]" /><p><strong className="text-[#2E2A24]">Prototype thresholds, not real-bridge safety limits.</strong> These values are intended for demonstration and lab testing only.</p></div></div>
}
