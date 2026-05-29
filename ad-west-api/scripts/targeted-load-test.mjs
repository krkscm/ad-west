import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { performance } from 'node:perf_hooks'

const BASE_URL = process.env.LOAD_TEST_BASE_URL || 'http://localhost:3001/api/v1'
const ADMIN_IDENTIFIER = process.env.LOAD_TEST_IDENTIFIER || 'super.admin@adwest.local'
const ADMIN_PASSWORD = process.env.LOAD_TEST_PASSWORD || 'SuperAdmin@123'
const REQUEST_TIMEOUT_MS = Number(process.env.LOAD_TEST_TIMEOUT_MS || 15000)

const OUTPUT_DIR = path.resolve(process.cwd(), '..', 'ad-docs', 'application-documentation')
const OUTPUT_JSON = path.join(OUTPUT_DIR, '08-load-test-results.json')
const OUTPUT_MD = path.join(OUTPUT_DIR, '08-performance-and-security-baselines.md')

function percentile(sorted, p) {
  if (!sorted.length) return 0
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[idx]
}

function decodeCaptchaAnswer(captchaToken) {
  const [encoded] = String(captchaToken || '').split('.')
  if (!encoded) throw new Error('Invalid captcha token format')
  const decoded = Buffer.from(encoded, 'base64url').toString('utf8')
  const payload = JSON.parse(decoded)
  if (!payload?.answer) throw new Error('Captcha answer missing in token payload')
  return String(payload.answer)
}

async function requestJson(method, endpoint, { token, body, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    let payload = null
    const text = await response.text()
    if (text) {
      try {
        payload = JSON.parse(text)
      } catch {
        payload = text
      }
    }

    return { ok: response.ok, status: response.status, payload }
  } finally {
    clearTimeout(timeoutId)
  }
}

async function performLogin() {
  const captcha = await requestJson('GET', '/auth/captcha')
  if (!captcha.ok) {
    throw new Error(`Captcha request failed: HTTP ${captcha.status}`)
  }

  const captchaToken = captcha.payload?.captchaToken
  const captchaAnswer = decodeCaptchaAnswer(captchaToken)

  const login = await requestJson('POST', '/auth/login', {
    body: {
      identifier: ADMIN_IDENTIFIER,
      password: ADMIN_PASSWORD,
      captchaToken,
      captchaAnswer,
    },
  })

  if (!login.ok || !login.payload?.accessToken) {
    throw new Error(`Login failed: HTTP ${login.status} payload=${JSON.stringify(login.payload)}`)
  }

  return login.payload.accessToken
}

async function runScenario(name, { iterations, concurrency, runOne }) {
  const durations = []
  let success = 0
  let failed = 0
  const statusCounts = new Map()

  let cursor = 0
  const startedAt = performance.now()

  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const i = cursor
      cursor += 1
      if (i >= iterations) return

      const reqStarted = performance.now()
      try {
        const { ok, status } = await runOne()
        const elapsed = performance.now() - reqStarted
        durations.push(elapsed)
        statusCounts.set(status, (statusCounts.get(status) || 0) + 1)
        if (ok) success += 1
        else failed += 1
      } catch {
        const elapsed = performance.now() - reqStarted
        durations.push(elapsed)
        statusCounts.set('error', (statusCounts.get('error') || 0) + 1)
        failed += 1
      }
    }
  })

  await Promise.all(workers)

  const wallMs = performance.now() - startedAt
  const sorted = [...durations].sort((a, b) => a - b)
  const p50 = percentile(sorted, 50)
  const p95 = percentile(sorted, 95)
  const p99 = percentile(sorted, 99)
  const avg = sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0
  const rps = wallMs > 0 ? (success + failed) / (wallMs / 1000) : 0
  const errorRate = (success + failed) > 0 ? (failed / (success + failed)) * 100 : 0

  return {
    name,
    iterations,
    concurrency,
    success,
    failed,
    errorRate,
    throughputRps: rps,
    latencyMs: { avg, p50, p95, p99, max: sorted[sorted.length - 1] || 0 },
    statusCounts: Object.fromEntries(statusCounts.entries()),
  }
}

function budgetFrom(result) {
  const p95Budget = Math.max(150, Math.ceil(result.latencyMs.p95 * 1.3))
  const p99Budget = Math.max(250, Math.ceil(result.latencyMs.p99 * 1.35))
  const minRpsBudget = Math.max(5, Math.floor(result.throughputRps * 0.7))
  return {
    p95Ms: p95Budget,
    p99Ms: p99Budget,
    minRps: minRpsBudget,
    maxErrorRatePct: 1.0,
  }
}

function toMarkdown(results, budgets) {
  const lines = []
  lines.push('# 08 - Performance and Security Baselines')
  lines.push('')
  lines.push(`Generated at: ${new Date().toISOString()}`)
  lines.push('')
  lines.push('## Targeted Load Test Results')
  lines.push('')
  lines.push('| Scenario | Requests | Concurrency | p95 (ms) | p99 (ms) | Avg (ms) | Throughput (req/s) | Error Rate |')
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |')
  for (const r of results) {
    lines.push(`| ${r.name} | ${r.iterations} | ${r.concurrency} | ${r.latencyMs.p95.toFixed(1)} | ${r.latencyMs.p99.toFixed(1)} | ${r.latencyMs.avg.toFixed(1)} | ${r.throughputRps.toFixed(1)} | ${r.errorRate.toFixed(2)}% |`)
  }
  lines.push('')
  lines.push('## Latency and Reliability Budgets')
  lines.push('')
  lines.push('| Scenario | p95 Budget (ms) | p99 Budget (ms) | Min Throughput (req/s) | Max Error Rate |')
  lines.push('| --- | ---: | ---: | ---: | ---: |')
  for (const r of results) {
    const b = budgets[r.name]
    lines.push(`| ${r.name} | ${b.p95Ms} | ${b.p99Ms} | ${b.minRps} | ${b.maxErrorRatePct.toFixed(2)}% |`)
  }
  lines.push('')
  lines.push('## Rate Limiting Baseline (Implemented)')
  lines.push('')
  lines.push('- Auth captcha: 20 requests/minute per client tracker')
  lines.push('- Auth login: 10 requests/minute per client tracker')
  lines.push('- Member login: 10 requests/minute per client tracker')
  lines.push('- Public helpdesk ticket submit: 8 requests/minute per client tracker')
  lines.push('- Public job post submit: 5 requests/minute per client tracker')
  lines.push('- Public job application submit: 8 requests/minute per client tracker')
  lines.push('- Public event registration submit: 12 requests/minute per client tracker')
  lines.push('')
  lines.push('These limits are enforced via NestJS route-level `@Throttle` decorators and can be tuned as traffic patterns evolve.')
  lines.push('')
  return lines.join('\n')
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })

  const adminToken = await performLogin()

  const scenarios = [
    {
      name: 'auth_captcha',
      iterations: 120,
      concurrency: 12,
      runOne: () => requestJson('GET', '/auth/captcha'),
    },
    {
      name: 'auth_login_transaction',
      iterations: 80,
      concurrency: 8,
      runOne: async () => {
        const captcha = await requestJson('GET', '/auth/captcha')
        if (!captcha.ok) return { ok: false, status: captcha.status }
        const answer = decodeCaptchaAnswer(captcha.payload?.captchaToken)
        return requestJson('POST', '/auth/login', {
          body: {
            identifier: ADMIN_IDENTIFIER,
            password: ADMIN_PASSWORD,
            captchaToken: captcha.payload?.captchaToken,
            captchaAnswer: answer,
          },
        })
      },
    },
    {
      name: 'gateway_helpdesk_list',
      iterations: 120,
      concurrency: 12,
      runOne: () => requestJson('GET', '/gateway/helpdesk/tickets', { token: adminToken }),
    },
    {
      name: 'gateway_jobs_list',
      iterations: 120,
      concurrency: 12,
      runOne: () => requestJson('GET', '/gateway/jobs', { token: adminToken }),
    },
    {
      name: 'insights_dependencies_bundle',
      iterations: 60,
      concurrency: 6,
      runOne: async () => {
        const endpoints = [
          '/member-services/events',
          '/org/sreni-definitions',
          '/org/reports',
          '/settings/report-metrics',
          '/gateway/helpdesk/tickets',
          '/gateway/jobs',
          '/gateway/jobs/applications',
          '/approvals/items',
        ]

        for (const endpoint of endpoints) {
          const response = await requestJson('GET', endpoint, { token: adminToken })
          if (!response.ok) return response
        }

        return { ok: true, status: 200 }
      },
    },
  ]

  const results = []
  for (const scenario of scenarios) {
    console.log(`Running ${scenario.name}...`)
    const result = await runScenario(scenario.name, scenario)
    results.push(result)
    console.log(`${scenario.name}: p95=${result.latencyMs.p95.toFixed(1)}ms, error=${result.errorRate.toFixed(2)}%, rps=${result.throughputRps.toFixed(1)}`)
  }

  const budgets = Object.fromEntries(results.map((result) => [result.name, budgetFrom(result)]))

  await writeFile(OUTPUT_JSON, JSON.stringify({
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    scenarios: results,
    budgets,
  }, null, 2))

  await writeFile(OUTPUT_MD, toMarkdown(results, budgets))

  console.log('Load test complete.')
  console.log(`Results: ${OUTPUT_JSON}`)
  console.log(`Budgets: ${OUTPUT_MD}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
