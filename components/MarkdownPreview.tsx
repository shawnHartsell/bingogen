"use client";

import { useRef, useCallback, useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownPreviewProps {
  content: string;
  /** When provided, checkboxes become interactive and toggle task-list items in the source markdown. */
  onContentChange?: (updated: string) => void;
}

/**
 * Toggle the nth task-list checkbox (`- [ ]` ↔ `- [x]`) in raw markdown.
 */
function toggleCheckbox(markdown: string, checkboxIndex: number): string {
  const taskPattern = /^(\s*[-*+]\s+)\[([ xX])\]/gm;
  let current = 0;
  return markdown.replace(
    taskPattern,
    (match, prefix: string, state: string) => {
      if (current++ === checkboxIndex) {
        const toggled = state === " " ? "x" : " ";
        return `${prefix}[${toggled}]`;
      }
      return match;
    },
  );
}

export function MarkdownPreview({
  content,
  onContentChange,
}: MarkdownPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Event-delegation click handler: determine which checkbox was clicked
   * by its DOM position among all checkboxes in the container at click time.
   * This avoids fragile render-time counters that can desync with React 19
   * strict-mode double renders.
   */
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (
        !onContentChange ||
        target.tagName !== "INPUT" ||
        (target as HTMLInputElement).type !== "checkbox"
      )
        return;

      // Prevent the browser from toggling the checkbox itself — the
      // re-render driven by onContentChange will set the correct state.
      e.preventDefault();

      const container = containerRef.current;
      if (!container) return;

      const allCheckboxes = Array.from(
        container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
      );
      const index = allCheckboxes.indexOf(target as HTMLInputElement);
      if (index >= 0) {
        onContentChange(toggleCheckbox(content, index));
      }
    },
    [content, onContentChange],
  );

  const components: Components = useMemo(
    () => ({
      input(props) {
        if (props.type === "checkbox") {
          return (
            <input
              type="checkbox"
              checked={!!props.checked}
              onChange={() => {}} // handled via container click delegation
              className="accent-yellow-400 cursor-pointer mr-1.5 align-middle"
            />
          );
        }
        return <input {...props} />;
      },
      // Strip bullets from task-list <ul> (remark-gfm adds "contains-task-list" class)
      ul({ className, children, ...rest }) {
        const isTaskList = className?.includes("contains-task-list");
        return (
          <ul
            className={isTaskList ? "list-none pl-0 my-1" : className}
            {...rest}
          >
            {children}
          </ul>
        );
      },
      // Remove default list marker padding for task-list items
      li({ className, children, ...rest }) {
        const isTask = className?.includes("task-list-item");
        return (
          <li
            className={isTask ? "list-none pl-0 my-0.5" : className}
            {...rest}
          >
            {children}
          </li>
        );
      },
    }),
    [],
  );

  if (!content.trim()) {
    return <p className="text-sm text-zinc-500 italic">No notes yet.</p>;
  }

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className="prose prose-sm prose-invert max-w-none prose-headings:text-zinc-100 prose-p:text-zinc-300 prose-strong:text-zinc-200 prose-li:text-zinc-300 prose-a:text-yellow-400 prose-code:text-yellow-300 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
