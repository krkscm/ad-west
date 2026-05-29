# 08 - Performance and Security Baselines

Generated at: 2026-05-29T19:50:18.615Z

## Targeted Load Test Results

| Scenario | Requests | Concurrency | p95 (ms) | p99 (ms) | Avg (ms) | Throughput (req/s) | Error Rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| auth_captcha | 120 | 12 | 51.6 | 56.3 | 20.9 | 553.8 | 0.00% |
| auth_login_transaction | 80 | 8 | 1148.3 | 1404.9 | 768.8 | 10.3 | 0.00% |
| gateway_helpdesk_list | 120 | 12 | 30.7 | 37.6 | 22.6 | 518.2 | 0.00% |
| gateway_jobs_list | 120 | 12 | 26.9 | 28.2 | 21.4 | 539.3 | 0.00% |
| insights_dependencies_bundle | 60 | 6 | 147.9 | 226.5 | 73.2 | 80.3 | 0.00% |

## Latency and Reliability Budgets

| Scenario | p95 Budget (ms) | p99 Budget (ms) | Min Throughput (req/s) | Max Error Rate |
| --- | ---: | ---: | ---: | ---: |
| auth_captcha | 150 | 250 | 387 | 1.00% |
| auth_login_transaction | 1493 | 1897 | 7 | 1.00% |
| gateway_helpdesk_list | 150 | 250 | 362 | 1.00% |
| gateway_jobs_list | 150 | 250 | 377 | 1.00% |
| insights_dependencies_bundle | 193 | 306 | 56 | 1.00% |

## Rate Limiting Baseline (Implemented)

- Auth captcha: 20 requests/minute per client tracker
- Auth login: 10 requests/minute per client tracker
- Member login: 10 requests/minute per client tracker
- Public helpdesk ticket submit: 8 requests/minute per client tracker
- Public job post submit: 5 requests/minute per client tracker
- Public job application submit: 8 requests/minute per client tracker
- Public event registration submit: 12 requests/minute per client tracker

These limits are enforced via NestJS route-level `@Throttle` decorators and can be tuned as traffic patterns evolve.
