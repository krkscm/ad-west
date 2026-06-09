import React, { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../components/common/PageHeader'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Cell,
} from 'recharts'
import { useAdminDefinitions } from '../context/admin-definitions-context'
import { backendApi } from '../utils/backendApi'

type InsightDatePreset = 'last_1_month' | 'last_3_months' | 'last_6_months' | 'last_1_year' | 'custom'

const INSIGHT_DATE_PRESETS: Array<{ value: InsightDatePreset; label: string; months: number }> = [
  { value: 'last_1_month', label: 'Last One month', months: 1 },
  { value: 'last_3_months', label: 'Last Three months', months: 3 },
  { value: 'last_6_months', label: 'Last Six Months', months: 6 },
  { value: 'last_1_year', label: 'Last One Year', months: 12 },
  { value: 'custom', label: 'Custom', months: 0 },
]

const toIsoDateOnly = (value: Date): string => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const buildPresetDateRange = (months: number) => {
  const to = new Date()
  const from = new Date(to)
  from.setMonth(from.getMonth() - months)

  return {
    fromDate: toIsoDateOnly(from),
    toDate: toIsoDateOnly(to),
  }
}

const LAST_ONE_MONTH_RANGE = buildPresetDateRange(1)

const CHART_COLORS = ['#2563eb', '#14b8a6', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316', '#10b981', '#ec4899', '#84cc16', '#6366f1']

const TOOLTIP_STYLE: React.CSSProperties = {
  background: 'var(--surface-dark)',
  border: '1px solid var(--border-dark)',
  borderRadius: '8px',
  fontSize: '0.82rem',
  color: 'var(--text-primary-dark)',
}

const parseNumericValue = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value !== 'string') return 0

  const cleaned = value.replace(/[^\d.-]/g, '')
  if (!cleaned) return 0
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

// ─── Helper components ────────────────────────────────────────────────────────

function ChartCard({ title, subtitle, badge, children }: { title: string; subtitle?: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: subtitle ? '2px' : '16px' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{title}</h3>
        {badge}
      </div>
      {subtitle && <p style={{ margin: '0 0 16px', fontSize: '0.78rem', color: 'var(--text-secondary-dark)' }}>{subtitle}</p>}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  )
}

function EmptyChart({ message = 'No data yet', height = 200 }: { message?: string; height?: number | string }) {
  return (
    <div style={{ height, minHeight: typeof height === 'number' ? height : 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary-dark)', fontSize: '0.85rem', flex: height === '100%' ? 1 : undefined }}>
      {message}
    </div>
  )
}

const withinRange = (isoDate: string | undefined, range?: { fromDate: string; toDate: string }): boolean => {
  if (!isoDate) return false
  if (!range) return true
  const valueMs = Date.parse(isoDate)
  if (!Number.isFinite(valueMs)) return false
  const fromMs = Date.parse(range.fromDate)
  const toMs = Date.parse(range.toDate)
  if (Number.isFinite(fromMs) && valueMs < fromMs) return false
  if (Number.isFinite(toMs) && valueMs > toMs) return false
  return true
}

const toMonthIso = (year: number, month: number): string => `${year}-${String(month).padStart(2, '0')}-01`

// ─── Page ─────────────────────────────────────────────────────────────────────

export function InsightsPage() {
  const { sreniDefinitions, activeSthanLocations } = useAdminDefinitions()
  const [loading, setLoading] = useState(true)
  const [datePreset, setDatePreset] = useState<InsightDatePreset>('last_1_month')

  const [srenies, setSrenies] = useState<any[]>([])
  const [sthans, setSthans] = useState<any[]>([])
  const [contactCountsBySreni, setContactCountsBySreni] = useState<Record<string, number>>({})
  const [contactCountsBySthan, setContactCountsBySthan] = useState<Record<string, number>>({})
  const [attendanceBySreni, setAttendanceBySreni] = useState<Record<string, number>>({})
  const [attendanceBySthan, setAttendanceBySthan] = useState<Record<string, number>>({})
  const [monthlyReports, setMonthlyReports] = useState<any[]>([])
  const [sthanReportsByLocation, setSthanReportsByLocation] = useState<Record<string, number>>({})
  const [customFromDate, setCustomFromDate] = useState(() => LAST_ONE_MONTH_RANGE.fromDate)
  const [customToDate, setCustomToDate] = useState(() => LAST_ONE_MONTH_RANGE.toDate)

  const selectedRange = useMemo(() => {
    if (datePreset === 'custom') {
      const hasBothDates = Boolean(customFromDate && customToDate)
      return hasBothDates
        ? { fromDate: customFromDate, toDate: customToDate }
        : undefined
    }

    const preset = INSIGHT_DATE_PRESETS.find((item) => item.value === datePreset) ?? INSIGHT_DATE_PRESETS[0]
    return buildPresetDateRange(preset.months)
  }, [customFromDate, customToDate, datePreset])

  const customDateRangeInvalid =
    datePreset === 'custom' &&
    customFromDate &&
    customToDate &&
    Date.parse(customFromDate) > Date.parse(customToDate)

  const handleResetDateFilter = () => {
    const nextRange = buildPresetDateRange(1)
    setDatePreset('last_1_month')
    setCustomFromDate(nextRange.fromDate)
    setCustomToDate(nextRange.toDate)
  }

  useEffect(() => {
    let cancelled = false

    const loadInsights = async () => {
      if (customDateRangeInvalid) {
        if (!cancelled) setLoading(false)
        return
      }

      if (!cancelled) setLoading(true)

      const sreniItems = sreniDefinitions
      const sthanItems = activeSthanLocations

      if (sreniItems.length === 0 && sthanItems.length === 0) {
        if (!cancelled) {
          setSrenies([])
          setSthans([])
          setLoading(false)
        }
        return
      }

      const mr = await Promise.allSettled([backendApi.listAllMonthlyReports(selectedRange)]).then((r) => r[0])

      if (cancelled) return

      setSrenies(sreniItems)
      setSthans(sthanItems)

      if (mr.status === 'fulfilled') setMonthlyReports(Array.isArray(mr.value) ? mr.value : (mr.value as any).items ?? [])

      const [
        sreniContactStats,
        sthanContacts,
        sreniAttendance,
        sthanReports,
      ] = await Promise.all([
        Promise.allSettled(sreniItems.map((sreni: any) => backendApi.getSreniParticipantStats(sreni.id))),
        Promise.allSettled(sthanItems.map((sthan: any) => backendApi.listSthanContacts(sthan.id, 1, 1))),
        Promise.allSettled(sreniItems.map((sreni: any) => backendApi.listSreniAttendanceListing(sreni.id))),
        Promise.allSettled(sthanItems.map((sthan: any) => backendApi.listSthanReports(sthan.id))),
      ])

      if (cancelled) return

      const nextSreniContacts: Record<string, number> = {}
      sreniItems.forEach((sreni: any, index: number) => {
        const result = sreniContactStats[index]
        nextSreniContacts[sreni.id] = result?.status === 'fulfilled'
          ? result.value.participantCount
          : 0
      })
      setContactCountsBySreni(nextSreniContacts)

      const nextSthanContacts: Record<string, number> = {}
      sthanItems.forEach((sthan: any, index: number) => {
        const result = sthanContacts[index]
        nextSthanContacts[sthan.id] = result?.status === 'fulfilled'
          ? result.value.total ?? result.value.items.length
          : 0
      })
      setContactCountsBySthan(nextSthanContacts)

      const nextSreniAttendance: Record<string, number> = {}
      const nextSthanAttendance: Record<string, number> = {}
      sreniItems.forEach((sreni: any, index: number) => {
        const result = sreniAttendance[index]
        if (result?.status !== 'fulfilled') {
          nextSreniAttendance[sreni.id] = 0
          return
        }

        const listingItems = Array.isArray(result.value) ? result.value : []
        const score = listingItems.reduce((sum: number, item: any) => {
          if (!withinRange(item.event?.date, selectedRange)) return sum
          const itemScore = item.metrics.reduce((metricSum: number, metricItem: any) => {
            const values = metricItem.capture?.values ?? {}
            const numeric = Object.values(values as Record<string, unknown>).reduce<number>((acc, value) => acc + parseNumericValue(value), 0)
            return metricSum + (numeric > 0 ? numeric : metricItem.capture ? 1 : 0)
          }, 0)

          if (item.event?.scope === 'sthan' && Array.isArray(item.event?.sthanIds)) {
            item.event.sthanIds.forEach((sthanId: string) => {
              nextSthanAttendance[sthanId] = (nextSthanAttendance[sthanId] ?? 0) + (itemScore > 0 ? itemScore : 1)
            })
          }

          return sum + itemScore
        }, 0)

        nextSreniAttendance[sreni.id] = score
      })
      setAttendanceBySreni(nextSreniAttendance)
      setAttendanceBySthan(nextSthanAttendance)

      const nextSthanReportsByLocation: Record<string, number> = {}
      sthanItems.forEach((sthan: any, index: number) => {
        const result = sthanReports[index]
        if (result?.status !== 'fulfilled') {
          nextSthanReportsByLocation[sthan.id] = 0
          return
        }

        const reports = Array.isArray(result.value) ? result.value : []
        nextSthanReportsByLocation[sthan.id] = reports.filter((report: any) => {
          const reportMonthIso = toMonthIso(report.periodYear, report.periodMonth)
          return withinRange(reportMonthIso, selectedRange)
        }).length
      })
      setSthanReportsByLocation(nextSthanReportsByLocation)
    }

    loadInsights().finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [customDateRangeInvalid, selectedRange, sreniDefinitions, activeSthanLocations])

  const contactsBySreni = useMemo(() => {
    return srenies
      .map((s, i) => ({
        name: s.name?.length > 14 ? s.name.slice(0, 14) + '…' : s.name,
        fullName: s.name,
        value: contactCountsBySreni[s.id] ?? 0,
        fill: CHART_COLORS[i % CHART_COLORS.length],
      }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [srenies, contactCountsBySreni])

  const contactsBySthan = useMemo(() => {
    return sthans
      .map((sthan, index) => ({
        name: sthan.name?.length > 16 ? sthan.name.slice(0, 16) + '…' : sthan.name,
        fullName: sthan.name,
        value: contactCountsBySthan[sthan.id] ?? 0,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .filter((sthan) => sthan.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [sthans, contactCountsBySthan])

  const attendanceSeriesBySreni = useMemo(() => {
    return srenies
      .map((s, i) => ({
        name: s.name?.length > 14 ? s.name.slice(0, 14) + '…' : s.name,
        fullName: s.name,
        value: attendanceBySreni[s.id] ?? 0,
        fill: CHART_COLORS[i % CHART_COLORS.length],
      }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [attendanceBySreni, srenies])

  const attendanceSeriesBySthan = useMemo(() => {
    return sthans
      .map((sthan, index) => ({
        name: sthan.name?.length > 16 ? sthan.name.slice(0, 16) + '…' : sthan.name,
        fullName: sthan.name,
        value: attendanceBySthan[sthan.id] ?? 0,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .filter((sthan) => sthan.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [attendanceBySthan, sthans])

  const reportsBySreni = useMemo(() => {
    const counts: Record<string, number> = {}
    monthlyReports.forEach((report: any) => {
      counts[report.sreniId] = (counts[report.sreniId] ?? 0) + 1
    })

    return srenies
      .map((sreni, index) => ({
        name: sreni.name?.length > 14 ? sreni.name.slice(0, 14) + '…' : sreni.name,
        fullName: sreni.name,
        value: counts[sreni.id] ?? 0,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .filter((sreni) => sreni.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [monthlyReports, srenies])

  const reportsBySthan = useMemo(() => {
    return sthans
      .map((sthan, index) => ({
        name: sthan.name?.length > 16 ? sthan.name.slice(0, 16) + '…' : sthan.name,
        fullName: sthan.name,
        value: sthanReportsByLocation[sthan.id] ?? 0,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .filter((sthan) => sthan.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [sthanReportsByLocation, sthans])

  const kpis = useMemo(() => {
    const sreniContactsTotal = Object.values(contactCountsBySreni).reduce((sum, value) => sum + value, 0)
    const sthanContactsTotal = Object.values(contactCountsBySthan).reduce((sum, value) => sum + value, 0)
    const sreniAttendanceScore = Object.values(attendanceBySreni).reduce((sum, value) => sum + value, 0)
    const sthanAttendanceScore = Object.values(attendanceBySthan).reduce((sum, value) => sum + value, 0)
    const sreniReportingTotal = monthlyReports.length
    const sthanReportingTotal = Object.values(sthanReportsByLocation).reduce((sum, value) => sum + value, 0)

    return {
      sreniContactsTotal,
      sthanContactsTotal,
      sreniAttendanceScore,
      sthanAttendanceScore,
      sreniReportingTotal,
      sthanReportingTotal,
    }
  }, [attendanceBySreni, attendanceBySthan, contactCountsBySreni, contactCountsBySthan, monthlyReports.length, sthanReportsByLocation])

  const renderHorizontalBar = (
    data: Array<{ name: string; fullName: string; value: number; fill: string }>,
    valueLabel: string,
    emptyMessage: string,
  ) => {
    if (data.length === 0) {
      return <EmptyChart message={emptyMessage} height="100%" />
    }

    return (
      <div style={{ flex: 1, minHeight: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" barSize={18}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dark)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-secondary-dark)' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-secondary-dark)' }} axisLine={false} tickLine={false} width={86} />
            <RTooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={{ fill: 'rgba(37,99,235,0.06)' }}
              formatter={(value: any, _: any, props: any) => [value, `${props.payload.fullName} (${valueLabel})`]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="animate-slide-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', color: 'var(--text-secondary-dark)' }}>
        Loading insights…
      </div>
    )
  }

  return (
    <div className="animate-slide-up" style={{ display: 'grid', gap: '20px' }}>

      {/* Header */}
      <PageHeader
        icon="📈"
        title="Insights"
        subtitle="Contacts, attendance, and reporting insights across Sreni and Sthan units."
      />

      <div className="glass-panel" style={{ padding: '16px', display: 'grid', gap: '8px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'end' }}>
          <label style={{ display: 'grid', gap: '6px', minWidth: '240px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)', fontWeight: 600 }}>Date filter</span>
            <select
              value={datePreset}
              onChange={(event) => setDatePreset(event.target.value as InsightDatePreset)}
              style={{
                background: 'var(--surface-dark)',
                color: 'var(--text-primary-dark)',
                border: '1px solid var(--border-dark)',
                borderRadius: '10px',
                padding: '9px 12px',
                fontSize: '0.88rem',
                fontWeight: 600,
              }}
            >
              {INSIGHT_DATE_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>{preset.label}</option>
              ))}
            </select>
          </label>

          {datePreset === 'custom' && (
            <>
              <label style={{ display: 'grid', gap: '6px', minWidth: '180px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)', fontWeight: 600 }}>From date</span>
                <input
                  type="date"
                  value={customFromDate}
                  onChange={(event) => setCustomFromDate(event.target.value)}
                  style={{
                    background: 'var(--surface-dark)',
                    color: 'var(--text-primary-dark)',
                    border: '1px solid var(--border-dark)',
                    borderRadius: '10px',
                    padding: '9px 12px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: '6px', minWidth: '180px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)', fontWeight: 600 }}>To date</span>
                <input
                  type="date"
                  value={customToDate}
                  onChange={(event) => setCustomToDate(event.target.value)}
                  style={{
                    background: 'var(--surface-dark)',
                    color: 'var(--text-primary-dark)',
                    border: '1px solid var(--border-dark)',
                    borderRadius: '10px',
                    padding: '9px 12px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                  }}
                />
              </label>
            </>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleResetDateFilter}
            style={{ height: '40px' }}
          >
            Reset
          </button>
        </div>

        {customDateRangeInvalid ? (
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--error)' }}>
            From date cannot be after To date.
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary-dark)' }}>
            Range sent to API: {selectedRange?.fromDate ?? '-'} to {selectedRange?.toDate ?? '-'}
          </p>
        )}
      </div>

      {/* Row 1: Contacts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <ChartCard title="Sreni Participants" subtitle={`${kpis.sreniContactsTotal} resolved participants (family contacts, children, or women)`}>
          {renderHorizontalBar(contactsBySreni, 'Participants', 'No Sreni participant data yet')}
        </ChartCard>

        <ChartCard title="Sthan Contacts" subtitle={`${kpis.sthanContactsTotal} total contacts`}>
          {renderHorizontalBar(contactsBySthan, 'Contacts', 'No Sthan contacts uploaded yet')}
        </ChartCard>
      </div>

      {/* Row 2: Attendance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <ChartCard title="Sreni Attendance" subtitle={`${kpis.sreniAttendanceScore.toLocaleString()} attendance score in selected range`}>
          {renderHorizontalBar(attendanceSeriesBySreni, 'Attendance', 'No Sreni attendance captured in selected range')}
        </ChartCard>

        <ChartCard title="Sthan Attendance" subtitle={`${kpis.sthanAttendanceScore.toLocaleString()} attendance score in selected range`}>
          {renderHorizontalBar(attendanceSeriesBySthan, 'Attendance', 'No Sthan attendance captured in selected range')}
        </ChartCard>
      </div>

      {/* Row 3: Reporting */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <ChartCard title="Sreni Reporting" subtitle={`${kpis.sreniReportingTotal} reports submitted in selected range`}>
          {renderHorizontalBar(reportsBySreni, 'Reports', 'No Sreni reports submitted in selected range')}
        </ChartCard>

        <ChartCard title="Sthan Reporting" subtitle={`${kpis.sthanReportingTotal} reports submitted in selected range`}>
          {renderHorizontalBar(reportsBySthan, 'Reports', 'No Sthan reports submitted in selected range')}
        </ChartCard>
      </div>

    </div>
  )
}
