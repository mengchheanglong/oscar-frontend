"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, X } from "lucide-react";

export function SidebarRename({
  value,
  label,
  maxLength,
  icon,
  onSave,
  onCancel,
}: {
  value: string;
  label: string;
  maxLength: number;
  icon?: ReactNode;
  onSave: (name: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(value),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);
  return (
    <form
      className="sidebar-rename"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || !name.trim()) return;
        setBusy(true);
        setError("");
        try {
          await onSave(name.trim());
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : "Could not rename. Try again.",
          );
        } finally {
          setBusy(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          if (!busy) onCancel();
        }
      }}
    >
      <div className="sidebar-rename-row">
        {icon}
        <input
          ref={input}
          aria-label={label}
          value={name}
          maxLength={maxLength}
          required
          disabled={busy}
          onChange={(event) => setName(event.target.value)}
        />
        <button
          type="button"
          className="project-mini-action"
          aria-label="Cancel rename"
          title="Cancel (Esc)"
          disabled={busy}
          onClick={onCancel}
        >
          <X />
        </button>
        <button
          type="submit"
          className="project-mini-action"
          aria-label="Save name"
          title="Save (Enter)"
          disabled={busy || !name.trim()}
        >
          <Check />
        </button>
      </div>
      {error && (
        <p role="alert" className="workspace-form-error">
          {error}
        </p>
      )}
    </form>
  );
}
