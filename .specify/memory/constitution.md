<!--
  Sync Impact Report
  Version change: N/A → 1.0.0 (initial ratification)
  Added principles: Spec-First Development, Next.js Conventions, Simplicity & Learning
  Added sections: Technology Stack, Development Workflow
  Removed sections: None
  Templates requiring updates: None (initial constitution)
  Follow-up TODOs: None
-->

# BingoGen Constitution

## Core Principles

### I. Spec-First Development (NON-NEGOTIABLE)

Every feature MUST begin with a specification before any code is written.
This is the primary learning objective of this project.

- A feature spec (via `/speckit.specify`) MUST exist and be reviewed
  before implementation begins.
- Specs MUST include user stories with acceptance scenarios written in
  Given/When/Then format.
- Implementation plans (via `/speckit.plan`) MUST be produced from
  approved specs before coding starts.
- Tasks (via `/speckit.tasks`) MUST be generated from the plan and
  worked in dependency order.
- Rationale: This project exists to practice spec-driven development.
  Skipping specs defeats the purpose even if the feature seems trivial.

### II. Next.js Conventions

All code MUST follow standard Next.js App Router patterns and idioms.
This is the primary technical learning objective.

- Use the App Router (`app/` directory) exclusively — no Pages Router.
- Prefer React Server Components by default; use `"use client"` only
  when client interactivity is required.
- Use Next.js built-in features (Route Handlers, Server Actions,
  `next/image`, `next/font`) before reaching for third-party
  alternatives.
- Data fetching MUST happen in Server Components or Server Actions
  unless client-side state is explicitly needed.
- Rationale: Learning Next.js idioms is a core goal. Fighting the
  framework to use familiar patterns defeats the learning objective.

### III. Simplicity & Learning

Every decision MUST favor the simplest approach that enables learning.

- YAGNI: Do not add infrastructure, abstractions, or dependencies
  until a spec explicitly requires them.
- Prefer fewer files and flat structures over deeply nested
  organization until complexity demands otherwise.
- When choosing between libraries, prefer the one with better
  documentation and learning resources.
- Comments SHOULD explain _why_, not _what_ — the code itself must
  be readable enough to convey intent.
- Rationale: Over-engineering obscures both the spec-driven workflow
  and the Next.js concepts being learned.

## Technology Stack

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Runtime**: Node.js 20+
- **Package Manager**: npm
- **Deployment**: Vercel (or local dev only — no complex CI/CD required)
- **Testing**: Vitest + React Testing Library (add only when a spec
  requires tested behavior)
- **Database**: None initially — add only when a spec requires
  persistence

## Development Workflow

1. **Specify**: Describe the feature → produce `spec.md` via speckit.
2. **Plan**: Produce `plan.md` with technical approach and structure.
3. **Task**: Generate `tasks.md` with ordered, actionable work items.
4. **Implement**: Work tasks in order, marking each complete.
5. **Review**: Verify acceptance scenarios from the spec are satisfied.

All spec artifacts live under `.specify/` and feature-specific specs
under `specs/[feature-name]/`. The spec workflow MUST be followed even
for small changes — practicing the process is the point.

## Governance

This constitution is the authoritative guide for all project decisions.

- Amendments MUST be documented with a version bump and rationale.
- If a principle feels wrong during development, document the friction
  in the spec and propose an amendment — do not silently ignore it.
- Versioning follows semver: MAJOR for principle removals/redefinitions,
  MINOR for new principles or sections, PATCH for clarifications.

**Version**: 1.0.0 | **Ratified**: 2026-03-01 | **Last Amended**: 2026-03-01
