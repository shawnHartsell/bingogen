# UI & Server Action Contracts: Card Persistence & Navigation

**Feature Branch**: `003-card-persistence`  
**Date**: 2026-03-21

## Route Contracts

### `/cards` — Card View Page

**File**: `app/cards/page.tsx` (Server Component)

| Aspect                  | Detail                                                            |
| ----------------------- | ----------------------------------------------------------------- |
| Type                    | Next.js App Router page (Server Component)                        |
| Query Params            | `id` (optional) — MongoDB ObjectId string                         |
| Behavior (with `id`)    | Load card by ID, render card view with sidebar                    |
| Behavior (without `id`) | Load most recently created card, render card view with sidebar    |
| Behavior (invalid `id`) | Render "card not found" state with link to create new card        |
| Behavior (no cards)     | Render empty state encouraging user to create a card              |
| Data fetching           | Server-side: fetch card list (projections) + active card document |

**Layout**: Sidebar (card list) on the left + main content (active card) on the right.

---

## Server Action Contracts

All server actions are `"use server"` functions in `lib/cards.ts`. They interact with MongoDB and return serializable data.

### `createCard(card: CreateCardInput): Promise<{ id: string }>`

Creates a new bingo card document in MongoDB.

**Input**:

```typescript
interface CreateCardInput {
  title: string; // Non-empty, user-provided
  cells: Cell[]; // Exactly 25 cells
  completedBingos: number[]; // Initially [] or computed
}
```

**Output**: `{ id: string }` — the MongoDB `_id` of the created document.

**Side effects**: Inserts document with `createdAt` and `updatedAt` timestamps.

**Errors**: Throws if title is empty or cells array is invalid.

---

### `updateCard(id: string, card: UpdateCardInput): Promise<void>`

Replaces the full card document in MongoDB (whole-document replacement).

**Input**:

```typescript
interface UpdateCardInput {
  title: string;
  cells: Cell[];
  completedBingos: number[];
}
```

**Output**: void (success) or throws on failure.

**Side effects**: Sets `updatedAt` to current timestamp. Does not modify `createdAt`.

**Errors**: Throws if card not found or input is invalid.

---

### `deleteCard(id: string): Promise<void>`

Deletes a card document from MongoDB.

**Input**: `id` — MongoDB ObjectId string.

**Output**: void (success) or throws on failure.

**Errors**: Throws if card not found.

---

### `getCard(id: string): Promise<BingoCardDocument | null>`

Fetches a single card document by ID.

**Input**: `id` — MongoDB ObjectId string.

**Output**: Full `BingoCardDocument` or `null` if not found.

---

### `listCards(): Promise<CardListItem[]>`

Fetches all cards as lightweight projections for the sidebar.

**Output**: Array of `CardListItem` sorted by `createdAt` descending (newest first).

**MongoDB projection**: `{ _id: 1, title: 1, createdAt: 1 }`

---

## Component Contracts

### `CardSidebar`

**File**: `components/CardSidebar.tsx` (Client Component)

| Prop           | Type                   | Description                                   |
| -------------- | ---------------------- | --------------------------------------------- |
| `cards`        | `CardListItem[]`       | List of saved cards for sidebar display       |
| `activeCardId` | `string \| null`       | ID of the currently viewed card (highlighted) |
| `onSelectCard` | `(id: string) => void` | Callback when a card is clicked               |
| `onDeleteCard` | `(id: string) => void` | Callback when delete action is triggered      |

**Behavior**:

- Renders a vertical list of card titles.
- Highlights the active card.
- Each card has an inline delete button.
- Clicking delete shows a confirmation dialog before calling `onDeleteCard`.
- Clicking a card title calls `onSelectCard`.

---

### `CardTitleInput`

**File**: `components/CardTitleInput.tsx` (Client Component)

| Prop       | Type                      | Description                                                                                        |
| ---------- | ------------------------- | -------------------------------------------------------------------------------------------------- |
| `title`    | `string`                  | Current card title                                                                                 |
| `onChange` | `(title: string) => void` | Callback when title is edited                                                                      |
| `editable` | `boolean`                 | Whether the title can be edited (true on card view, false during creation until goals are entered) |

**Behavior**:

- Displays the card title as an inline-editable heading.
- On blur or Enter key, triggers `onChange` with the new title.
- Validates non-empty before accepting changes.

---

### `DeleteConfirmDialog`

**File**: `components/DeleteConfirmDialog.tsx` (Client Component)

| Prop        | Type         | Description                                               |
| ----------- | ------------ | --------------------------------------------------------- |
| `isOpen`    | `boolean`    | Whether the dialog is visible                             |
| `cardTitle` | `string`     | Title of the card being deleted (displayed in the prompt) |
| `onConfirm` | `() => void` | Callback when user confirms deletion                      |
| `onCancel`  | `() => void` | Callback when user cancels deletion                       |

**Behavior**:

- Modal dialog with message: "Delete '{cardTitle}'? This cannot be undone."
- Two buttons: "Delete" (destructive) and "Cancel".
- Closes on cancel, backdrop click, or Escape key.

---

## Data Flow

```
[Goal Entry Page (/)]
    |
    | ( user enters 24 goals + title )
    | ( clicks "Generate Card" )
    |
    v
[Client: AppProvider]
    |
    | dispatch(GENERATE_CARD)
    | → builds cells from goals
    |
    | calls createCard() server action
    |   → inserts document in MongoDB
    |   → returns { id }
    |
    | router.push(`/cards?id=${id}`)
    |
    v
[Cards Page (/cards?id=xxx)]  ← Server Component
    |
    | server-side: listCards() → sidebar data
    | server-side: getCard(id) → active card data
    |
    | passes data as props to client components
    |
    v
[Client Components]
    |
    ├── CardSidebar (card list, navigation, delete)
    ├── CardTitleInput (editable title)
    ├── BingoCard (existing grid)
    ├── BingoCounter (existing counter)
    └── CellModal (existing cell editor)

    | ( on any change: toggle, notes, title )
    |
    | calls updateCard() server action
    |   → replaces full document in MongoDB
    |
    | ( on delete )
    |
    | calls deleteCard() server action
    |   → removes document from MongoDB
    |   → navigates to next card or empty state
```
