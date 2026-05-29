import React, { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip as RTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { backendApi } from '../utils/backendApi'

// ─── Palette ─────────────────────────────────────────────────────────────────

const C = {
  primary: '#6366f1',
  success: '#10b981',
  warning: '#f59e0b',
  error:   '#ef4444',
  sky:     '#0ea5e9',
  violet:  '#8b5cf6',
  rose:    '#f43f5e',
  teal:    '#14b8a6',
  slate:   '#64748b',
  amber:   '#f59e0b',
}

const SRENI_COLORS = [C.primary, C.sky, C.teal, C.success, C.violet, C.rose, C.warning, C.amber, '#e11d48', '#06b6d4', '#84cc16', '#f97316']

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

const customLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function InsightsPage() {
  const [loading, setLoading] = useState(true)

  const [tickets, setTickets] = useState<any[]>([])
  const [jobPostings, setJobPostings] = useState<any[]>([])
  const [jobApplications, setJobApplications] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [srenies, setSrenies] = useState<any[]>([])
  const [contactCountsBySreni, setContactCountsBySreni] = useState<Record<string, number>>({})
  const [monthlyReports, setMonthlyReports] = useState<any[]>([])
  const [reportParams, setReportParams] = useState<any[]>([])

  useEffect(() => {
    let cancelled = false

    const loadInsights = async () => {
      const [t, jp, ja, ev, sr, mr, rp] = await Promise.allSettled([
        backendApi.listHelpdeskTickets(),
        backendApi.listJobPostings(),
        backendApi.listAllJobApplications(),
        backendApi.listSpecialEvents(),
        backendApi.listSreniDefinitions(),
        backendApi.listAllMonthlyReports(),
        backendApi.listReportMetricDefinitions(),
      ])

      if (cancelled) return

      if (t.status === 'fulfilled') setTickets((t.value as any).items ?? t.value)
      if (jp.status === 'fulfilled') setJobPostings((jp.value as any).items ?? jp.value)
      if (ja.status === 'fulfilled') setJobApplications((ja.value as any).items ?? ja.value)
      if (ev.status === 'fulfilled') setEvents((ev.value as any).items ?? ev.value)

      const sreniItems = sr.status === 'fulfilled'
        ? (Array.isArray(sr.value) ? sr.value : (sr.value as any).items ?? [])
        : []

      setSrenies(sreniItems)

      if (mr.status === 'fulfilled') setMonthlyReports(Array.isArray(mr.value) ? mr.value : (mr.value as any).items ?? [])
      if (rp.status === 'fulfilled') setReportParams(Array.isArray(rp.value) ? rp.value : (rp.value as any).items ?? [])

      const nextContactCounts: Record<string, number> = {}
      if (sreniItems.length > 0) {
        const contactResults = await Promise.allSettled(
          sreniItems.map((sreni: any) => backendApi.listSreniContacts(sreni.id, 1, 1)),
        )

        if (cancelled) return

        sreniItems.forEach((sreni: any, index: number) => {
          const result = contactResults[index]
          nextContactCounts[sreni.id] = result?.status === 'fulfilled'
            ? result.value.total ?? result.value.items.length
            : 0
        })
      }

      setContactCountsBySreni(nextContactCounts)
    }

    loadInsights().finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const now = new Date().toISOString()

  // ── Helpdesk ──
  const ticketStatusColors: Record<string, string> = { open: C.error, in_progress: C.warning, resolved: C.success, closed: C.slate }
  const ticketsByStatus = Object.entries(
    tickets.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name: name.replace('_', ' '), value, fill: ticketStatusColors[name] ?? C.slate }))

  const ticketCategoryColors: Record<string, string> = { general: C.primary, technical: C.sky, financial: C.warning, membership: C.violet, other: C.slate }
  const ticketsByCategory = Object.entries(
    tickets.reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + 1; return acc }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, fill: ticketCategoryColors[name] ?? C.slate }))

  // ── Jobs ──
  const appStatusColors: Record<string, string> = { new: C.primary, under_review: C.sky, shortlisted: C.teal, rejected: C.error, accepted: C.success }
  const appsByStatus = Object.entries(
    jobApplications.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name: name.replace('_', ' '), value, fill: appStatusColors[name] ?? C.slate }))

  const postingTypeColors = [C.primary, C.sky, C.success, C.violet]
  const postingsByType = Object.entries(
    jobPostings.reduce((acc, j) => { acc[j.type] = (acc[j.type] || 0) + 1; return acc }, {} as Record<string, number>)
  ).map(([name, value], i) => ({ name: name.replace('_', ' '), value, fill: postingTypeColors[i % postingTypeColors.length] }))

  const activePostings = jobPostings.filter((j) => j.isActive).length
  const inactivePostings = jobPostings.length - activePostings

  // ── Upcoming Events ──
  const upcomingEventsList = events
    .filter((e) => e.dateTime > now)
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime))
    .slice(0, 6)

  // ── 1. Sreni Contacts Distribution ──
  // Count contacts per sreni using the srenyIds array on each contact
  const contactsBySreni = useMemo(() => {
    return srenies
      .map((s, i) => ({
        name: s.name?.length > 14 ? s.name.slice(0, 14) + '…' : s.name,
        fullName: s.name,
        Contacts: contactCountsBySreni[s.id] ?? 0,
        fill: SRENI_COLORS[i % SRENI_COLORS.length],
      }))
      .filter((s) => s.Contacts > 0)
      .sort((a, b) => b.Contacts - a.Contacts)
  }, [srenies, contactCountsBySreni])

  const totalContacts = Object.values(contactCountsBySreni).reduce((sum, count) => sum + count, 0)

  // ── 2. Revenue Generation by Sreni ──
  // Aggregate numeric report entries per sreni — look for revenue/collection/amount/fee fields
  const REVENUE_KEYS = /revenue|collection|amount|fee|income|total|receipt|fund/i
  const revenueMap = useMemo(() => {
    const next = new Map<string, number>()

    monthlyReports.forEach((report) => {
      if (!report.sreniId || !report.entries) return
      const current = next.get(report.sreniId) ?? 0
      const revenueFromReport = Object.entries(report.entries as Record<string, unknown>)
        .filter(([key]) => REVENUE_KEYS.test(key))
        .reduce((sum, [, val]) => sum + parseNumericValue(val), 0)
      next.set(report.sreniId, current + revenueFromReport)
    })

    return next
  }, [monthlyReports])

  const revenueData = useMemo(() => {
    return srenies
      .map((s, i) => ({
        name: s.name?.length > 14 ? s.name.slice(0, 14) + '…' : s.name,
        fullName: s.name,
        'Revenue (AED)': revenueMap.get(s.id) ?? 0,
        fill: SRENI_COLORS[i % SRENI_COLORS.length],
      }))
      .filter((s) => s['Revenue (AED)'] > 0)
      .sort((a, b) => b['Revenue (AED)'] - a['Revenue (AED)'])
  }, [srenies, revenueMap])

  const hasRevenueData = revenueData.length > 0
  const totalRevenue = revenueData.reduce((sum, r) => sum + r['Revenue (AED)'], 0)

  // Revenue placeholder: show all srenis with 0 if no real data (so chart structure is visible)
  const revenueChartData = hasRevenueData
    ? revenueData
    : srenies.slice(0, 8).map((s, i) => ({
        name: s.name?.length > 14 ? s.name.slice(0, 14) + '…' : s.name,
        fullName: s.name,
        'Revenue (AED)': 0,
        fill: SRENI_COLORS[i % SRENI_COLORS.length],
      }))

  // ── 3. Monthly Target Achievement ──
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()
  const monthName = new Date().toLocaleString('en-AE', { month: 'long' })

  // Reports submitted this month
  const thisMonthReports = useMemo(() => {
    return monthlyReports.filter(
      (r) => r.year === currentYear && r.month === currentMonth && r.status === 'submitted'
    )
  }, [monthlyReports, currentYear, currentMonth])
  const submittedCount = new Set(thisMonthReports.map((r) => r.sreniId)).size
  const pendingCount = srenies.length - submittedCount
  const submissionPct = srenies.length > 0 ? Math.round((submittedCount / srenies.length) * 100) : 0

  // Build metric achievement: compare total actuals against the combined target for all srenis.
  const metricsWithTarget = useMemo(() => {
    return reportParams.filter(
      (m: any) => m.inputType === 'number' && m.target != null && m.target > 0
    )
  }, [reportParams])

  const metricAchievementData = useMemo(() => {
    return metricsWithTarget.map((metric: any, i: number) => {
      const actual = thisMonthReports.reduce((sum: number, report: any) => {
        const raw = report.entries?.[metric.name]
        return sum + parseNumericValue(raw)
      }, 0)
      const combinedTarget = metric.target * srenies.length
      const pct = combinedTarget > 0 ? Math.min(100, Math.round((actual / combinedTarget) * 100)) : 0
      return {
        name: metric.name.length > 18 ? metric.name.slice(0, 18) + '…' : metric.name,
        fullName: metric.name,
        Achieved: actual,
        Target: combinedTarget,
        PerSreniTarget: metric.target,
        unit: metric.unit ?? '',
        pct,
        fill: SRENI_COLORS[i % SRENI_COLORS.length],
      }
    })
  }, [metricsWithTarget, thisMonthReports, srenies.length])

  const hasMetricTargets = metricAchievementData.length > 0
  const perSreniTargetTotal = useMemo(
    () => metricsWithTarget.reduce((sum: number, metric: any) => sum + metric.target, 0),
    [metricsWithTarget],
  )

  const achievementBySreni = useMemo(() => {
    const reportsBySreni = new Map<string, any>()
    thisMonthReports.forEach((report: any) => {
      reportsBySreni.set(report.sreniId, report)
    })

    return srenies.map((sreni: any, index: number) => {
      const report = reportsBySreni.get(sreni.id)

      if (!hasMetricTargets) {
        const pct = report ? 100 : 0
        return {
          id: sreni.id,
          name: sreni.name,
          achieved: report ? 1 : 0,
          target: 1,
          pct,
          statusLabel: report ? 'Submitted' : 'Pending',
          color: pct >= 80 ? C.success : pct >= 50 ? C.warning : C.error,
          fill: SRENI_COLORS[index % SRENI_COLORS.length],
        }
      }

      const achieved = metricsWithTarget.reduce((sum: number, metric: any) => {
        const raw = report?.entries?.[metric.name]
        return sum + parseNumericValue(raw)
      }, 0)
      const target = perSreniTargetTotal
      const pct = target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0

      return {
        id: sreni.id,
        name: sreni.name,
        achieved,
        target,
        pct,
        statusLabel: report ? 'Submitted' : 'No report',
        color: pct >= 80 ? C.success : pct >= 50 ? C.warning : C.error,
        fill: SRENI_COLORS[index % SRENI_COLORS.length],
      }
    })
  }, [hasMetricTargets, metricsWithTarget, perSreniTargetTotal, srenies, thisMonthReports])

  const overallAchievementPct = useMemo(() => {
    if (!hasMetricTargets) return submissionPct

    const totals = achievementBySreni.reduce(
      (sum, sreni: any) => ({
        achieved: sum.achieved + sreni.achieved,
        target: sum.target + sreni.target,
      }),
      { achieved: 0, target: 0 },
    )

    if (totals.target <= 0) return 0
    return Math.min(100, Math.round((totals.achieved / totals.target) * 100))
  }, [achievementBySreni, hasMetricTargets, submissionPct])

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
      <div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>Insights</h2>
        <p style={{ color: 'var(--text-secondary-dark)', fontSize: '0.9rem', margin: '6px 0 0' }}>
          Community activity and operational overview across all modules.
        </p>
      </div>

      {/* Row 1: Helpdesk */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <ChartCard title="Helpdesk Tickets by Status" subtitle="Open vs resolved breakdown">
          {ticketsByStatus.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={ticketsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} labelLine={false} label={customLabel}>
                  {ticketsByStatus.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <RTooltip contentStyle={TOOLTIP_STYLE} />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '0.78rem' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Helpdesk Tickets by Category" subtitle="What members are asking about">
          {ticketsByCategory.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ticketsByCategory} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dark)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary-dark)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary-dark)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <RTooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                <Bar dataKey="value" name="Tickets" radius={[4, 4, 0, 0]}>
                  {ticketsByCategory.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Row 2: Jobs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <ChartCard title="Job Applications by Status" subtitle="Pipeline from new to accepted">
          {appsByStatus.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={appsByStatus} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dark)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary-dark)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary-dark)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <RTooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                <Bar dataKey="value" name="Applications" radius={[4, 4, 0, 0]}>
                  {appsByStatus.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Job Postings by Type" subtitle={`${activePostings} active · ${inactivePostings} inactive`}>
          {postingsByType.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={postingsByType} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} labelLine={false} label={customLabel}>
                  {postingsByType.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <RTooltip contentStyle={TOOLTIP_STYLE} />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '0.78rem' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Row 3: Sreni Intelligence */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>

        {/* Chart 1: Contacts per Sreni */}
        <ChartCard
          title="Contacts by Sreni"
          subtitle={`${totalContacts} total contacts across ${srenies.length} srenis`}
        >
          {contactsBySreni.length === 0 ? (
            <EmptyChart message="No contacts mapped to srenis yet" height="100%" />
          ) : (
            <div style={{ flex: 1, minHeight: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={contactsBySreni} barSize={20} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dark)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-secondary-dark)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-secondary-dark)' }} axisLine={false} tickLine={false} width={80} />
                  <RTooltip
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                    formatter={(val: any, _: any, props: any) => [val, props.payload.fullName]}
                  />
                  <Bar dataKey="Contacts" radius={[0, 4, 4, 0]}>
                    {contactsBySreni.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        {/* Chart 2: Revenue by Sreni */}
        <ChartCard
          title="Revenue by Sreni"
          badge={
            !hasRevenueData
              ? <span className="badge badge-info" style={{ fontSize: '0.68rem', whiteSpace: 'nowrap' }}>Awaiting reports</span>
              : undefined
          }
        >
          {srenies.length === 0 ? (
            <EmptyChart message="No srenis configured" height="100%" />
          ) : (
            <div style={{ flex: 1, minHeight: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChartData} barSize={20} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dark)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-secondary-dark)' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-secondary-dark)' }} axisLine={false} tickLine={false} width={80} />
                  <RTooltip
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                    formatter={(val: any, _: any, props: any) => [`AED ${Number(val).toLocaleString()}`, props.payload.fullName]}
                  />
                  <Bar dataKey="Revenue (AED)" radius={[0, 4, 4, 0]}>
                    {revenueChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        {/* Chart 3: Monthly Target Achievement — per metric */}
        <ChartCard
          title={`${monthName} Target Achievement`}
          badge={
            <span
              className={`badge ${overallAchievementPct >= 80 ? 'badge-success' : overallAchievementPct >= 50 ? 'badge-warning' : 'badge-error'}`}
              style={{ fontSize: '0.68rem' }}
            >
              {overallAchievementPct}%
            </span>
          }
        >
          {/* Submission progress bar */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary-dark)', marginBottom: '4px' }}>
              <span>Report submissions</span>
              <span>{submittedCount} / {srenies.length}</span>
            </div>
            <div style={{ height: '6px', background: 'var(--border-dark)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${submissionPct}%`, background: submissionPct >= 80 ? C.success : submissionPct >= 50 ? C.warning : C.error, borderRadius: '3px', transition: 'width 0.4s' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
              {achievementBySreni.map((sreni: any) => (
                <div key={sreni.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '48%' }} title={sreni.name}>
                      {sreni.name}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary-dark)', flexShrink: 0 }}>
                      <strong style={{ color: sreni.color }}>
                        {hasMetricTargets ? sreni.achieved.toLocaleString() : sreni.statusLabel}
                      </strong>
                      {hasMetricTargets
                        ? ` / ${sreni.target.toLocaleString()} · ${sreni.pct}%`
                        : ` · ${sreni.pct}%`}
                    </span>
                  </div>
                  <div style={{ height: '7px', background: 'var(--border-dark)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${sreni.pct}%`, background: sreni.color, borderRadius: '4px', transition: 'width 0.5s' }} />
                  </div>
                </div>
              ))}
          </div>
        </ChartCard>
      </div>

      {/* Row 4: Upcoming Events */}
      <ChartCard title="Upcoming Special Events" subtitle="Next events scheduled across Srenis">
        {upcomingEventsList.length === 0 ? (
          <div style={{ color: 'var(--text-secondary-dark)', fontSize: '0.85rem', padding: '12px 0' }}>No upcoming events scheduled.</div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date &amp; Time</th>
                  <th>Venue</th>
                  <th>Srenis</th>
                  <th>Registration</th>
                </tr>
              </thead>
              <tbody>
                {upcomingEventsList.map((ev) => (
                  <tr key={ev.id}>
                    <td style={{ fontWeight: 600 }}>{ev.title}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)', whiteSpace: 'nowrap' }}>
                      {new Date(ev.dateTime).toLocaleString('en-AE', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary-dark)' }}>{ev.venue || '—'}</td>
                    <td>
                      {ev.sreniIds?.length > 0
                        ? <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{ev.sreniIds.length} sreni{ev.sreniIds.length > 1 ? 's' : ''}</span>
                        : <span style={{ color: 'var(--text-secondary-dark)', fontSize: '0.8rem' }}>—</span>}
                    </td>
                    <td>
                      {ev.registrationEnabled
                        ? <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Open</span>
                        : <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>Closed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

    </div>
  )
}
