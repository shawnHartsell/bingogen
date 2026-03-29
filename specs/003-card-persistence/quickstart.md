# Quickstart: Card Persistence & Navigation

**Feature Branch**: `003-card-persistence`  
**Date**: 2026-03-21

## Prerequisites

- Node.js 20+
- npm
- MongoDB (local instance)

## Setup

### 1. Install MongoDB Locally

**macOS (Homebrew)**:

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

This starts `mongod` on `localhost:27017`. Verify it's running:

```bash
mongosh --eval "db.runCommand({ ping: 1 })"
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
MONGODB_URI=mongodb://localhost:27017/bingogen
```

No username/password needed for local development.

### 3. Install Dependencies

```bash
npm install mongodb
```

### 4. Run the Development Server

```bash
npm run dev
```

Navigate to `http://localhost:3000` to use the app.

## Deployment

Hosted infrastructure (MongoDB Atlas, containers, Terraform, Vercel config) is out of scope for this feature and will be addressed in a later feature. For now, the app runs locally only.

## Key Files (New)

| File                                 | Purpose                                                                |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `lib/db.ts`                          | MongoDB client connection (cached singleton)                           |
| `lib/cards.ts`                       | Server actions: createCard, updateCard, deleteCard, getCard, listCards |
| `app/cards/page.tsx`                 | Card view page with sidebar + query string routing                     |
| `components/CardSidebar.tsx`         | Sidebar card list component                                            |
| `components/CardTitleInput.tsx`      | Editable card title component                                          |
| `components/DeleteConfirmDialog.tsx` | Delete confirmation modal                                              |

## Smoke Test

1. Start the dev server (`npm run dev`).
2. Go to `http://localhost:3000`, enter 24 goals and a title, click "Generate Card".
3. Verify you're redirected to `/cards?id=<some-id>`.
4. Toggle a cell, add notes, edit the title.
5. Refresh the page — all changes should persist.
6. Create a second card — it should appear in the sidebar.
7. Click between cards in the sidebar to verify navigation.
8. Delete a card via the sidebar — confirm the prompt works.
