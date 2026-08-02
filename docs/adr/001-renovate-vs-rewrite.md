# ADR 001: Renovate versus Rewrite

## Context
The prototype had a useful React visual identity but unsafe identity/persistence seams and no tests. A full rewrite could discard working UI and user-owned changes.

## Decision
Renovate incrementally behind new application, module, service, and repository seams; preserve practical visual assets and replace unsafe backend behavior phase by phase.

## Alternatives
Greenfield rewrite; retain the prototype and only document limitations.

## Why selected
Incremental renovation keeps visible value, produces reviewable migrations, and demonstrates engineering judgment rather than hiding legacy constraints.

## Trade-offs
Temporary compatibility files and mixed old/new concepts require careful cleanup. A rewrite can yield faster structural consistency but has higher regression/scope risk.

## How verified
Baseline commit/dirty state were recorded, existing UI was retained, each phase added tests, and MySQL/client-trusted paths were removed only after replacements worked.

## Limitations
Git history still begins with a prototype and some component naming reflects that origin.

## Migration trigger
Rewrite a bounded component only when renovation cost, defects, or coupling are measured to exceed replacement risk; do not use a rewrite as a default architecture goal.
