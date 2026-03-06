# Quickstart: Bingo Card Creation UX

**Feature**: `001-card-creation-ux` | **Date**: 2026-03-01

---

## Prerequisites

- **Node.js** 20+ (`node -v`)
- **npm** 10+ (`npm -v`)

---

## Setup

```bash
# Clone (if needed) and switch to feature branch
git checkout 001-card-creation-ux

# Create Next.js project (if not already initialized)
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=no --import-alias="@/*" --use-npm

# Install feature dependencies
npm install react-markdown remark-gfm
```

---

## Development

```bash
# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Routes

| Route   | View       | Purpose                                        |
| ------- | ---------- | ---------------------------------------------- |
| `/`     | Goal Entry | Enter 24 goals, generate card                  |
| `/card` | Card View  | View bingo card, toggle completion, edit notes |

---

## Project Structure

```text
app/
├── layout.tsx           # Root layout + AppProvider
├── page.tsx             # Goal entry view
├── card/page.tsx        # Card view
└── globals.css          # Tailwind + bingo-glow animation

components/              # All client components
├── AppProvider.tsx
├── GoalInput.tsx
├── GoalList.tsx
├── GoalCounter.tsx
├── BingoCard.tsx
├── BingoCell.tsx
├── CellModal.tsx
├── MarkdownPreview.tsx
├── MarkdownEditor.tsx
└── BingoCounter.tsx

lib/                     # Pure utilities + types
├── types.ts
├── shuffle.ts
└── bingo.ts
```

---

## Key Commands

| Command         | Purpose                  |
| --------------- | ------------------------ |
| `npm run dev`   | Start development server |
| `npm run build` | Production build         |
| `npm run lint`  | Run ESLint               |

---

## Technology Quick Reference

| Tech           | Version      | Purpose                     |
| -------------- | ------------ | --------------------------- |
| Next.js        | 15+          | App Router, React framework |
| React          | 19           | UI library                  |
| TypeScript     | 5.x (strict) | Type safety                 |
| Tailwind CSS   | 4            | Styling                     |
| react-markdown | latest       | Markdown rendering          |
| remark-gfm     | latest       | GFM task lists plugin       |

---

## Notes

- **No database** — all state is in-memory (React Context). Browser refresh clears everything.
- **No authentication** — single-user, single-session.
- **Mobile-first** — test at 375px viewport width minimum.
- Refer to [spec.md](spec.md) for full requirements and [plan.md](plan.md) for architecture decisions.
