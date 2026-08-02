# ADR 007: JavaScript versus TypeScript

## Context
Planning favored gradual TypeScript migration, while the explicit implementation constraint requires React, Node, and Express with JavaScript and forbids an unsafe all-at-once rewrite.

## Decision
Keep current production modules in strict modern JavaScript, use Zod for external runtime validation, tests for contracts, and clear module/DTO boundaries that permit gradual TypeScript adoption later.

## Alternatives
Immediate full TypeScript rewrite; incremental `checkJs`/JSDoc; no static analysis.

## Why selected
It follows the explicit language requirement, preserves working code, and demonstrates that TypeScript erases at runtime and cannot replace input validation.

## Trade-offs
JavaScript catches fewer refactor/type errors before execution. TypeScript improves editor/compiler feedback but adds configuration and migration complexity.

## How verified
ESLint, `node --check`, Zod strict schemas, DTO tests, unit/integration/browser tests, and builds pass.

## Limitations
Current `typecheck` is syntax checking, not full static type analysis; its name is retained as the workspace contract.

## Migration trigger
Start with shared contracts, API services, backend modules, and domain state when defect/refactor evidence shows static types will repay migration cost; keep Zod at trust boundaries.
