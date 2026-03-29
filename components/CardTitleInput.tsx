"use client";

import { useState, useRef, useEffect } from "react";

interface CardTitleInputProps {
  title: string;
  onChange: (title: string) => void;
  editable: boolean;
}

export function CardTitleInput({
  title,
  onChange,
  editable,
}: CardTitleInputProps) {
  const [value, setValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(title);
  }, [title]);

  function handleCommit() {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setValue(title); // revert to last valid
      return;
    }
    if (trimmed !== title) {
      onChange(trimmed);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current?.blur();
    }
  }

  if (!editable) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onChange(e.target.value);
        }}
        placeholder="Card title…"
        className="w-full bg-transparent text-2xl sm:text-3xl font-bold tracking-tight text-center outline-none placeholder:text-zinc-600"
      />
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleCommit}
      onKeyDown={handleKeyDown}
      placeholder="Card title…"
      className="w-full bg-transparent text-2xl sm:text-3xl font-bold tracking-tight text-center outline-none border-b border-transparent focus:border-zinc-600 transition-colors placeholder:text-zinc-600"
    />
  );
}
