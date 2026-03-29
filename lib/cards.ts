"use server";

import { ObjectId } from "mongodb";
import { db } from "@/lib/db";
import type { Cell, BingoCardDocument, CardListItem } from "@/lib/types";

const cards = db.collection("cards");

// ─── Input Types ──────────────────────────────────────────
interface CreateCardInput {
  title: string;
  cells: Cell[];
  completedBingos: number[];
}

interface UpdateCardInput {
  title: string;
  cells: Cell[];
  completedBingos: number[];
}

// ─── Create ───────────────────────────────────────────────
export async function createCard(
  input: CreateCardInput,
): Promise<{ id: string }> {
  if (!input.title.trim()) {
    throw new Error("Card title is required");
  }
  if (input.cells.length !== 25) {
    throw new Error("Card must have exactly 25 cells");
  }

  const now = new Date();
  const result = await cards.insertOne({
    title: input.title.trim(),
    cells: input.cells,
    completedBingos: input.completedBingos,
    createdAt: now,
    updatedAt: now,
  });

  return { id: result.insertedId.toHexString() };
}

// ─── Read (single) ───────────────────────────────────────
export async function getCard(id: string): Promise<BingoCardDocument | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const doc = await cards.findOne({ _id: new ObjectId(id) });
  if (!doc) return null;

  return {
    _id: doc._id.toHexString(),
    title: doc.title as string,
    cells: doc.cells as Cell[],
    completedBingos: doc.completedBingos as number[],
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

// ─── Read (list) ─────────────────────────────────────────
export async function listCards(): Promise<CardListItem[]> {
  const docs = await cards
    .find({}, { projection: { _id: 1, title: 1, createdAt: 1 } })
    .sort({ createdAt: -1 })
    .toArray();

  return docs.map((doc) => ({
    _id: doc._id.toHexString(),
    title: doc.title as string,
    createdAt: doc.createdAt as Date,
  }));
}

// ─── Update ──────────────────────────────────────────────
export async function updateCard(
  id: string,
  input: UpdateCardInput,
): Promise<void> {
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid card ID");
  }
  if (!input.title.trim()) {
    throw new Error("Card title is required");
  }
  if (input.cells.length !== 25) {
    throw new Error("Card must have exactly 25 cells");
  }

  const existing = await cards.findOne(
    { _id: new ObjectId(id) },
    { projection: { createdAt: 1 } },
  );
  if (!existing) {
    throw new Error("Card not found");
  }

  await cards.replaceOne(
    { _id: new ObjectId(id) },
    {
      title: input.title.trim(),
      cells: input.cells,
      completedBingos: input.completedBingos,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    },
  );
}

// ─── Delete ──────────────────────────────────────────────
export async function deleteCard(id: string): Promise<void> {
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid card ID");
  }

  const result = await cards.deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 0) {
    throw new Error("Card not found");
  }
}
