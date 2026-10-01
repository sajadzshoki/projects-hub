"use client";

import { useEffect, useRef, useState } from "react";
import type { ChecklistItem } from "@/lib/types";
import { MAX_CHECKLIST_ITEMS, MAX_CHECKLIST_TEXT } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { CheckIcon, ListChecksIcon, PlusIcon, XIcon } from "@/components/icons";

interface LiveProps {
  persist: "live";
  projectId: string;
  items: ChecklistItem[];
  /** "card" sits on the grid card; "page" is the project detail view. */
  variant: "card" | "page";
  onChange?: (items: ChecklistItem[]) => void;
}

interface DraftProps {
  persist: "draft";
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  error?: string;
}

type ProjectChecklistProps = LiveProps | DraftProps;

/**
 * A project's checklist.
 * "live" saves each tick, add, or remove immediately.
 * "draft" only updates local form state until the project itself is saved.
 */
export default function ProjectChecklist(props: ProjectChecklistProps) {
  if (props.persist === "draft") {
    return (
      <ChecklistView
        items={props.items}
        variant="form"
        error={props.error}
        onCommit={props.onChange}
      />
    );
  }

  return <LiveChecklist {...props} />;
}

function LiveChecklist({ projectId, items, variant, onChange }: LiveProps) {
  const [list, setList] = useState(items);
  const [error, setError] = useState("");
  const committed = useRef(items);
  const desired = useRef(items);
  const generation = useRef(0);
  const saving = useRef(false);

  // Pick up server data (navigation, refresh) without clobbering an in-flight edit.
  useEffect(() => {
    if (saving.current) return;
    committed.current = items;
    desired.current = items;
    setList(items);
  }, [items]);

  async function commit(next: ChecklistItem[]) {
    generation.current += 1;
    desired.current = next;
    setList(next);
    if (saving.current) return;

    saving.current = true;
    setError("");
    try {
      while (true) {
        const genAtSend = generation.current;
        const snapshot = desired.current;
        const response = await fetch(`/api/projects/${projectId}/checklist`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checklist: snapshot }),
        });
        const data = (await response.json().catch(() => ({}))) as {
          checklist?: ChecklistItem[];
          error?: string;
        };
        if (!response.ok || !data.checklist) {
          throw new Error(data.error || "Could not update the checklist.");
        }
        if (genAtSend !== generation.current) continue;
        committed.current = data.checklist;
        desired.current = data.checklist;
        setList(data.checklist);
        onChange?.(data.checklist);
        return;
      }
    } catch (caught) {
      generation.current += 1;
      desired.current = committed.current;
      setList(committed.current);
      setError(caught instanceof Error ? caught.message : "Could not update the checklist.");
    } finally {
      saving.current = false;
    }
  }

  return (
    <ChecklistView items={list} variant={variant} error={error} onCommit={(next) => void commit(next)} />
  );
}

function ChecklistView({
  items,
  variant,
  error,
  onCommit,
}: {
  items: ChecklistItem[];
  variant: "card" | "page" | "form";
  error?: string;
  onCommit: (items: ChecklistItem[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const compact = variant === "card";
  const doneCount = items.filter((item) => item.done).length;
  const atLimit = items.length >= MAX_CHECKLIST_ITEMS;

  function addItem() {
    const text = draft.trim();
    if (!text || atLimit) return;
    setDraft("");
    onCommit([...items, { id: crypto.randomUUID(), text, done: false }]);
  }

  function toggle(id: string) {
    onCommit(items.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
  }

  function remove(id: string) {
    onCommit(items.filter((item) => item.id !== id));
  }

  function rename(id: string, text: string) {
    onCommit(items.map((item) => (item.id === id ? { ...item, text } : item)));
  }

  return (
    <section className={cn("space-y-2", compact && "space-y-1.5")}>
      <div className="flex items-center justify-between gap-2">
        <h2
          className={cn(
            "flex items-center gap-1.5 font-mono font-medium uppercase tracking-widest text-muted",
            compact ? "text-[10.5px]" : "text-[11px]"
          )}
        >
          <ListChecksIcon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
          Checklist
        </h2>
        {items.length > 0 && (
          <span className="font-mono text-[10.5px] text-muted">
            {doneCount}/{items.length}
          </span>
        )}
      </div>

      {items.length > 0 && (
        <div className="h-1 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-200"
            style={{ width: `${Math.round((doneCount / items.length) * 100)}%` }}
          />
        </div>
      )}

      {items.length > 0 && (
        <ul className={cn("space-y-0.5", compact && "max-h-36 overflow-y-auto pr-0.5")}>
          {items.map((item) => {
            const box = (
              <span
                className={cn(
                  "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors",
                  item.done
                    ? "border-accent bg-accent text-white"
                    : "border-border-strong bg-surface-2 group-hover/check:border-accent"
                )}
              >
                {item.done && <CheckIcon className="h-3 w-3" />}
              </span>
            );

            return (
              <li key={item.id} className="flex items-start gap-1.5">
                {variant === "form" ? (
                  <>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={item.done}
                      aria-label={item.done ? `Uncheck ${item.text}` : `Check ${item.text}`}
                      onClick={() => toggle(item.id)}
                      className="group/check rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                    >
                      {box}
                    </button>
                    <input
                      value={item.text}
                      maxLength={MAX_CHECKLIST_TEXT}
                      aria-label="Checklist item"
                      onChange={(event) => rename(item.id, event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.preventDefault();
                      }}
                      className={cn(
                        "min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted/50",
                        item.done && "text-muted line-through"
                      )}
                    />
                  </>
                ) : (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={item.done}
                    aria-label={item.done ? `Uncheck ${item.text}` : `Check ${item.text}`}
                    onClick={() => toggle(item.id)}
                    className="group/check flex min-w-0 flex-1 items-start gap-1.5 rounded py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                  >
                    {box}
                    <span
                      className={cn(
                        "min-w-0 flex-1 break-words leading-snug",
                        compact ? "text-xs" : "text-sm",
                        item.done ? "text-muted line-through" : "text-text"
                      )}
                    >
                      {item.text}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  aria-label={`Remove ${item.text}`}
                  title="Remove"
                  className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded text-muted/50 transition-colors hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center gap-1.5">
        <PlusIcon className={cn("shrink-0 text-muted/70", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
        <input
          value={draft}
          maxLength={MAX_CHECKLIST_TEXT}
          disabled={atLimit}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addItem();
            }
          }}
          placeholder={atLimit ? `Limit of ${MAX_CHECKLIST_ITEMS} items` : "Add an item and press Enter"}
          aria-label="New checklist item"
          className={cn(
            "min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted/50 disabled:cursor-not-allowed",
            compact ? "text-xs" : "text-sm"
          )}
        />
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
    </section>
  );
}
