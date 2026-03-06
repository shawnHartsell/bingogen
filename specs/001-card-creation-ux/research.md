# Research: Bingo Card Creation UX

**Feature**: `001-card-creation-ux` | **Date**: 2026-03-01
**Context**: Next.js 15 App Router, TypeScript (strict), React 19, Tailwind CSS 4
**Governing Principles**: Simplicity & Learning, Next.js Conventions, YAGNI

---

## Topic 1: Markdown Rendering in React

### Decision

Use **`react-markdown`** with the `remark-gfm` plugin for rendering CommonMark + task list checkboxes.

### Rationale

`react-markdown` is the dominant React Markdown renderer for good reason:

- **Pure React output** — renders to a React virtual DOM tree, not raw HTML. No `dangerouslySetInnerHTML`, no XSS surface area.
- **Plugin ecosystem** — `remark-gfm` adds GFM task lists (`- [ ]` / `- [x]`), tables, and strikethrough in one line of config. This directly satisfies FR-010 (standard Markdown + checklists).
- **Lightweight** — `react-markdown` is ~12 KB gzipped; `remark-gfm` adds ~3 KB. Total ≈15 KB for full functionality.
- **Zero config** — works out of the box as a React component: `<ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>`.
- **Well-maintained** — part of the unified/remark ecosystem (>10M weekly npm downloads), actively maintained, excellent TypeScript types.
- **Learning value** — its component-based API (`components` prop for custom renderers) teaches React composition patterns without requiring deep Markdown AST knowledge.

For the 500-character limit (FR-010a), the constraint is enforced at the textarea input level, not the renderer. `react-markdown` handles any valid CommonMark string regardless of length.

### Alternatives Considered

| Library                                        | Pros                                                   | Cons                                                                                                                                                                                                    | Verdict                                                     |
| ---------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **markdown-it + React wrapper**                | Fast, extensible, GFM plugin available                 | Outputs HTML strings → requires `dangerouslySetInnerHTML` or a wrapper like `markdown-it-react` (less maintained). More moving parts for the same result.                                               | ❌ More complexity, XSS concerns without sanitization layer |
| **marked + `dangerouslySetInnerHTML`**         | Very fast, small footprint                             | Requires manual HTML sanitization (DOMPurify or similar). No React component tree — just injected HTML. Anti-pattern in React apps.                                                                     | ❌ Security concern, not idiomatic React                    |
| **MDX (via `@next/mdx` or `next-mdx-remote`)** | First-class Next.js support, can embed JSX in Markdown | Designed for content authoring at build time, not runtime user input rendering. Heavy for a 500-char note field. Would require `next-mdx-remote` for dynamic content which adds significant complexity. | ❌ Overkill — designed for CMS/docs, not user-entered notes |
| **Custom parser**                              | Full control, no dependencies                          | Reinventing the wheel. GFM task list parsing alone is non-trivial. Violates Simplicity principle.                                                                                                       | ❌ Unnecessary complexity                                   |

### Implementation Notes

```bash
npm install react-markdown remark-gfm
```

```tsx
// components/MarkdownPreview.tsx
"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownPreview({ content }: { content: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>;
}
```

Two dependencies added. Aligns with the plan's existing choice of `react-markdown` and the constitution's minimal-dependency principle (Principle III).

---

## Topic 2: Bingo Detection Algorithm

### Decision

Use **brute-force check of all 12 lines** on every completion toggle. Predefine the 12 line definitions as a constant array of index tuples.

### Rationale

- **Simplicity** — a 5×5 grid has exactly 12 possible bingo lines. Checking all 12 on every toggle is 60 cell lookups total — trivially fast, well under the <1s requirement (SC-006). This will execute in microseconds.
- **Correctness** — brute-force eliminates edge cases from incremental tracking. When a cell is un-toggled (FR-016d: bingo revocation), the full recheck naturally handles it without special rollback logic.
- **Readability** — the 12 line definitions are self-documenting. Any developer can read the code and understand exactly what constitutes a bingo.
- **Stateless** — the function takes the current grid state and returns the set of completed lines. No mutable tracking state to synchronize. This aligns with React's declarative model.

The check should run on **every toggle** (both mark and unmark). Since the function is pure and O(1) for a fixed 5×5 grid, there is no performance concern. This also correctly handles rapid toggling (edge case from spec).

#### Animation trigger: only newly completed lines

The celebration animation must fire **only for bingo lines that were not already completed before the toggle**. The reducer stores the previous set of completed bingo line indices (`previousBingos`). After each toggle:

1. Compute `newBingos = detectBingos(currentCompleted)`
2. Diff: `freshBingos = newBingos.filter(b => !previousBingos.includes(b))`
3. Animate only cells belonging to lines in `freshBingos`

**Example**: Row 0 `[0,1,2,3,4]` and Column 0 `[0,5,10,15,20]` are both complete. If the user un-toggles cell 0 and re-toggles it, both lines become newly completed (they were both lost), so both animate. But if only cell 5 is toggled to complete Column 0 while Row 0 was already complete, only Column 0 animates — Row 0 was never lost and is not "new."

### Alternatives Considered

| Approach                    | Pros                                                                                | Cons                                                                                                                                                                          | Verdict                                                  |
| --------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **Bitmap/bitmask**          | Elegant for large grids; O(1) per line check with bitwise AND                       | Over-engineered for 5×5. Adds conceptual complexity (bit manipulation) for zero performance gain. Harder to debug and extend.                                                 | ❌ Premature optimization, violates Simplicity principle |
| **Incremental check**       | Only checks lines affected by the toggled cell (2–4 lines per toggle instead of 12) | Requires tracking which lines each cell belongs to. Marginal savings (12 → 2-4 checks) when each check is already nanosecond-scale. Adds complexity for un-toggle/revocation. | ❌ Added complexity for negligible gain                  |
| **Event-driven / observer** | Decoupled architecture                                                              | Massively over-engineered for a 25-cell grid. Multiple sources of truth risk.                                                                                                 | ❌ YAGNI                                                 |

### Implementation Notes

```ts
// lib/bingo.ts

// Each line is an array of 5 cell indices (0-24, row-major order)
const BINGO_LINES: readonly number[][] = [
  // Rows
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  // Columns
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  // Diagonals
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20],
] as const;

/** Returns indices of completed bingo lines (0-11) */
export function detectBingos(completed: boolean[]): number[] {
  return BINGO_LINES.map((line, i) =>
    line.every((idx) => completed[idx]) ? i : -1,
  ).filter((i) => i !== -1);
}

/** Returns only the bingo lines that are new since the previous check */
export function findNewBingos(current: number[], previous: number[]): number[] {
  const prevSet = new Set(previous);
  return current.filter((b) => !prevSet.has(b));
}
```

Index 12 (center) should always be `true` in the `completed` array. The function is pure, testable, and ~15 lines of code.

---

## Topic 3: CSS Animation for Bingo Line Highlight

### Decision

Use **Tailwind CSS 4 with a custom `@keyframes` animation** defined in `globals.css`. Apply it via a conditional class name — no additional dependencies.

### Rationale

- **Zero new dependencies** — Tailwind CSS 4 supports custom animations through `@theme` and standard `@keyframes` in CSS. No need for framer-motion or any animation library.
- **Tailwind 4 native** — Tailwind CSS 4 supports arbitrary animation utilities via `animate-[name]` and custom keyframes defined in the CSS layer. This is idiomatic Tailwind 4.
- **Simple trigger model** — when `detectBingos()` returns a newly completed line, add the animation class to those cells. After the animation duration (1-2s), the class can remain (the animation runs once via `animation-iteration-count: 1`) or be removed.
- **Mobile-safe** — CSS animations use GPU compositing for `transform` and `opacity` properties. A glow effect via `box-shadow` or `outline` is performant on all modern mobile browsers (375px+).
- **Spec-aligned** — FR-016b specifies "brief highlight/glow animation (1–2 seconds)." A CSS keyframe with `animation-duration: 1.5s` and `animation-fill-mode: none` achieves exactly this.

### Alternatives Considered

| Approach                                                                    | Pros                                               | Cons                                                                                                                                                                                                                                          | Verdict                         |
| --------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **Tailwind built-in animate utilities** (`animate-pulse`, `animate-bounce`) | Zero config                                        | None of the built-in animations match "highlight/glow." `animate-pulse` is an opacity loop, not a one-shot glow. Cannot customize duration or effect easily.                                                                                  | ❌ Wrong visual effect          |
| **Framer Motion**                                                           | Powerful, declarative, React-native API            | Adds ~30 KB gzipped for a single 1.5s animation. Overkill for this use case. Violates constitution Principle III (YAGNI).                                                                                                                     | ❌ Unnecessary dependency       |
| **CSS transitions (no keyframes)**                                          | Simpler than keyframes for simple property changes | Transitions require a state change (add class) but don't naturally "play and stop." A glow that appears and fades needs a two-stage transition or timeout to remove the class. Keyframes handle this more cleanly with `forwards` / one-shot. | ❌ Awkward for one-shot effects |
| **Inline styles via React state**                                           | No CSS needed                                      | Requires managing timers, re-renders, and style objects. Anti-pattern for animations.                                                                                                                                                         | ❌ Poor separation of concerns  |

### Implementation Notes

```css
/* app/globals.css */
@keyframes bingo-glow {
  0% {
    box-shadow: 0 0 0 0 rgba(250, 204, 21, 0.7); /* yellow-400 */
  }
  50% {
    box-shadow: 0 0 20px 8px rgba(250, 204, 21, 0.5);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(250, 204, 21, 0);
  }
}

@theme {
  --animate-bingo-glow: bingo-glow 1.5s ease-out;
}
```

```tsx
// In BingoCell.tsx — conditionally applied
<div className={isNewBingo ? "animate-bingo-glow" : ""}>
```

The animation runs once (default `animation-iteration-count: 1`), lasts 1.5 seconds, and requires no JavaScript timers. Total addition: ~10 lines of CSS.

---

## Topic 4: Modal/Dialog Pattern in Next.js App Router

### Decision

Use the **native HTML `<dialog>` element** with manual accessibility attributes by using `showModal()` for open and listening for the `close` event. No headless UI library.

### Rationale

- **Zero dependencies** — the HTML `<dialog>` element is supported in all modern browsers (Chrome 37+, Firefox 98+, Safari 15.4+). No library needed.
- **Built-in accessibility** — `<dialog>` with `showModal()` provides:
  - Native backdrop (`::backdrop` pseudo-element, styleable with Tailwind)
  - Focus trapping (automatic — focus stays inside the dialog)
  - Escape key dismissal (built-in, fires `close` event)
  - `aria-modal="true"` implicit when opened via `showModal()`
  - Inert background (elements behind the dialog are non-interactive)
- **Simplicity** — aligns directly with constitution Principle III. The spec requires a centered modal with backdrop dismiss, close button, and two modes (read/edit). `<dialog>` handles the modal mechanics; the content is standard React components.
- **Learning value** — teaches the platform API before reaching for abstractions. Understanding `<dialog>` is transferable knowledge.
- **Backdrop click dismissal** — requires a small pattern: listen for `click` on the `<dialog>` element itself (not its children) since clicks on the backdrop target the `<dialog>`. A common pattern:

```tsx
function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
  if (e.target === e.currentTarget) {
    dialogRef.current?.close();
  }
}
```

### Alternatives Considered

| Approach                                          | Pros                                          | Cons                                                                                                                                                                                  | Verdict                                             |
| ------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Radix UI Dialog**                               | Excellent accessibility, composable, unstyled | Adds a dependency (`@radix-ui/react-dialog`). For a single modal in a learning project, the abstraction obscures what's actually happening. Can add later if more dialogs are needed. | ❌ YAGNI — one modal doesn't justify the dependency |
| **Headless UI Dialog**                            | Tailwind-first philosophy, good a11y          | Also a dependency. Less actively maintained since Tailwind Labs shifted focus. Similar YAGNI concern.                                                                                 | ❌ Same concern as Radix                            |
| **Custom `<div>` overlay**                        | Full control, no API to learn                 | Must manually implement: focus trapping, Escape handling, `aria-modal`, scroll locking, backdrop, z-index stacking. Error-prone and accessibility-risky.                              | ❌ Reinventing what `<dialog>` provides for free    |
| **Next.js Parallel Routes / Intercepting Routes** | URL-driven modals, shareable links            | Over-engineered for a client-only modal with no URL significance. The cell detail view is ephemeral UI, not a route. Adds routing complexity.                                         | ❌ Wrong abstraction level                          |

### Implementation Notes

```tsx
// components/CellModal.tsx
"use client";
import { useRef, useEffect } from "react";

interface CellModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function CellModal({ open, onClose, children }: CellModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close();
      }}
      className="backdrop:bg-black/50 rounded-xl p-0 max-w-lg w-full"
    >
      {children}
    </dialog>
  );
}
```

The `::backdrop` pseudo-element is styled with Tailwind's `backdrop:` modifier. Focus trapping and Escape handling are free. Total: one component, ~30 lines, zero dependencies.

---

## Topic 5: State Management for Client-Only App

### Decision

Use **React Context + `useReducer`** with a single provider wrapping the app layout. No external state library.

### Rationale

- **Zero dependencies** — Context + `useReducer` is built into React 19. No npm install needed.
- **Survives App Router navigation** — a context provider placed in the root layout (`app/layout.tsx`) persists across client-side route transitions between `/` and `/card`. The provider is a client component; the layout itself can remain a server component that renders the provider as a child.
- **Right-sized for this state** — the state shape is small and well-defined:
  - `goals: string[]` (up to 24 items)
  - `cells: Cell[]` (25 items with completion flag and notes)
  - `shuffledGoals: string[] | null` (the generated card arrangement)

  This is comfortably within `useReducer` territory — a single reducer with ~8-10 action types.

- **Explicit actions** — `useReducer` gives named, dispatchable actions (`ADD_GOAL`, `REMOVE_GOAL`, `GENERATE_CARD`, `TOGGLE_COMPLETION`, `UPDATE_NOTES`, etc.) that are easy to trace and debug. This is more structured than `useState` for interconnected state.
- **Learning value** — teaches the React state management primitives that Zustand and Redux are built on. Understanding reducers is foundational.
- **Spec-aligned** — FR-012 requires in-memory session state. Context provides exactly this — state exists as long as the React tree is mounted (app tab is open). Browser refresh clears it (matching the spec's explicit expectation).

### Alternatives Considered

| Approach                             | Pros                                                                                          | Cons                                                                                                                                                                                                                                                                                                               | Verdict                                          |
| ------------------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| **Zustand**                          | Minimal boilerplate, works outside React tree, persists across navigation easily, tiny (1 KB) | It's a dependency. For this project's state complexity (one object, ~10 actions), Zustand's advantage over `useReducer` is marginal. Adding it violates YAGNI. Could revisit if multiple features need shared stores.                                                                                              | ❌ YAGNI — marginal benefit for this scope       |
| **Jotai**                            | Atomic state model, good for independent pieces of state                                      | State here is interconnected (goals → card → cells → bingos), not atomic. Jotai's atom model would scatter related state. Dependency concern same as Zustand.                                                                                                                                                      | ❌ Wrong model for interconnected state          |
| **URL state (`searchParams`)**       | Shareable, bookmarkable, SSR-friendly                                                         | 24 goals + 25 cell states + notes = far too much data for URL params. Not meaningful to share. Encoding/decoding overhead for no benefit.                                                                                                                                                                          | ❌ Wrong tool — state is too large and ephemeral |
| **Lifting state to a shared parent** | No context needed, simple prop drilling                                                       | With two routes (`/` and `/card`), there's no shared parent component in the App Router — they're separate page components. A layout could hold state, but layouts in App Router don't re-render on navigation; they'd need to be client components with context anyway, which is the same as the chosen approach. | ❌ Converges to Context anyway                   |
| **`useState` in layout**             | Simplest possible                                                                             | No named actions, state updates would be scattered callbacks. `useReducer` is marginally more code but significantly more organized for 8-10 state transitions.                                                                                                                                                    | ❌ Unstructured for this complexity level        |

### Implementation Notes

```tsx
// lib/types.ts
interface AppState {
  goals: string[];
  cells: Cell[];
  bingoLines: number[]; // indices of completed lines
}

type AppAction =
  | { type: "ADD_GOAL"; goal: string }
  | { type: "REMOVE_GOAL"; index: number }
  | { type: "GENERATE_CARD" }
  | { type: "TOGGLE_COMPLETION"; cellIndex: number }
  | { type: "UPDATE_NOTES"; cellIndex: number; notes: string }
  | { type: "RESET" };
```

```tsx
// components/AppProvider.tsx
"use client";
import { createContext, useContext, useReducer } from "react";

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
```

```tsx
// app/layout.tsx
import { AppProvider } from "@/components/AppProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
```

The provider wraps all routes. Both `/` and `/card` access the same state via `useApp()`. Navigation between routes preserves state because the layout (and provider) don't unmount during client-side transitions.

**Key consideration**: Next.js App Router client-side navigation (`<Link>`, `useRouter().push()`) keeps the layout mounted. A full page reload (browser refresh, manual URL entry) will remount and lose state — which is the spec's expected behavior.

---

## Summary of Decisions

| Topic              | Decision                                 | New Dependencies       |
| ------------------ | ---------------------------------------- | ---------------------- |
| Markdown Rendering | `react-markdown` + `remark-gfm`          | 2 packages (~15 KB gz) |
| Bingo Detection    | Brute-force 12-line check, pure function | None                   |
| Bingo Animation    | Custom `@keyframes` in Tailwind CSS 4    | None                   |
| Modal/Dialog       | Native `<dialog>` element                | None                   |
| State Management   | React Context + `useReducer`             | None                   |

**Total new dependencies**: 2 (`react-markdown`, `remark-gfm`)

This aligns with the constitution's Simplicity & Learning principle (III) and YAGNI mandate. The only external packages are for Markdown rendering, where building from scratch would be unreasonable.
