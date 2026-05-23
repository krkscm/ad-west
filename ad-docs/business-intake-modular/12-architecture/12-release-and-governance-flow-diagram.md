# Release and Governance Flow Diagram

## Scope
Planning and governance flow from intake baseline through release and operations acceptance.

```mermaid
flowchart LR
  A[Intake Baseline Approved]
  B[Requirements Baseline]
  C[Design Baseline]
  D[Implementation Complete]
  E[QA Exit Recommendation]
  F[Release Readiness Review]
  G[Go Live]
  H[Operational Acceptance]
  I[Retrospective and Improvement]

  A --> B --> C --> D --> E --> F --> G --> H --> I

  R1[Risk and Compliance Review]
  R2[Reporting and Forecast Review]

  B --> R1
  C --> R1
  E --> R1
  F --> R1

  D --> R2
  E --> R2
  F --> R2
  H --> R2

  classDef phase fill:#e8f4fd,stroke:#1f77b4,color:#111;
  classDef control fill:#fff3cd,stroke:#b8860b,color:#111;
  class A,B,C,D,E,F,G,H,I phase;
  class R1,R2 control;
```

## Verification Checklist
- [ ] Governance gates are complete and ordered.
- [ ] Risk/compliance and reporting controls overlay each major gate.
- [ ] Flow aligns with 16-week phased plan.
