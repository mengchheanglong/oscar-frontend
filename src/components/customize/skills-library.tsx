"use client";
import { useEffect, useState } from "react";
import { Box, Plus, Search, X, ArrowUpRight, Trash2 } from "lucide-react";
import { skillsApi, type Skill, type SkillInput } from "@/lib/skills-api";
import { Modal } from "@/components/ui/modal";
const empty: SkillInput = {
  slug: "",
  name: "",
  description: "",
  instructions: "",
};
const sample: SkillInput = {
  slug: "clear-plan",
  name: "Clear plan",
  description: "Turn a complex task into a concise, verifiable plan.",
  instructions:
    "When the task benefits from planning, state the intended outcome, list a short sequence of concrete steps, identify missing information, and finish with how the result will be verified. For simple questions, answer directly. When delegating, give the agent the outcome, relevant constraints, and acceptance checks. Do not claim actions were performed without evidence.",
};
export function SkillsLibrary() {
  const [rows, setRows] = useState<Skill[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [editing, setEditing] = useState<Skill | null | undefined>(),
    [draft, setDraft] = useState<SkillInput>(empty),
    [busy, setBusy] = useState(false),
    [removing, setRemoving] = useState<Skill | null>(null);
  useEffect(() => {
    let alive = true;
    skillsApi
      .list()
      .then((r) => {
        if (alive) setRows(r);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  const open = async (row?: Skill) => {
    setError("");
    if (!row) {
      setDraft(empty);
      setEditing(null);
      return;
    }
    setBusy(true);
    try {
      const full = await skillsApi.get(row.id);
      setDraft({
        slug: full.slug,
        name: full.name,
        description: full.description,
        instructions: full.instructions || "",
      });
      setEditing(full);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load skill.");
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const row = await skillsApi.save(draft, editing?.id, editing?.version);
      setRows((old) => [...old.filter((r) => r.id !== row.id), row]);
      setEditing(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save skill.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <header className="customize-page-header">
        <div>
          <h1>Skills</h1>
          <p>Reusable guidance for OSCAR and your connected agents.</p>
        </div>
        <button
          className="customize-primary"
          onClick={() => void open()}
          disabled={busy}
        >
          <Plus size={17} />
          Add skill
        </button>
      </header>
      <div className="customize-search">
        <Search size={18} />
        <input
          aria-label="Search skills"
          placeholder="Search skills"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="customize-section-heading">
        <h2>Your library</h2>
        <span>
          {rows.length} {rows.length === 1 ? "skill" : "skills"}
        </span>
      </div>
      {error && (
        <p role="alert" className="text-red-400 text-sm my-3">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Loading skills…</p>
      ) : rows.length === 0 ? (
        <div className="customize-empty">
          <Box size={32} />
          <h2>No skills yet</h2>
          <p>
            Add instructions once, then use <code>/skill-name</code> in a chat.
            They stay available in that conversation and travel with delegated
            work.
          </p>
          <button
            className="customize-secondary"
            onClick={() => {
              setDraft(sample);
              setEditing(null);
            }}
          >
            Try the Clear plan skill
            <ArrowUpRight size={16} />
          </button>
        </div>
      ) : (
        <div className="customize-grid">
          {rows
            .filter((r) =>
              `${r.name} ${r.slug} ${r.description}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((row) => (
              <article key={row.id} className="customize-skill">
                <button
                  className="customize-skill-main"
                  onClick={() => void open(row)}
                  disabled={busy}
                >
                  <span className="customize-tool-icon">
                    <Box size={22} />
                  </span>
                  <span>
                    <strong>{row.name}</strong>
                    <small>{row.description}</small>
                    <code>/{row.slug}</code>
                  </span>
                </button>
                <button
                  className="workspace-icon-button"
                  title={`Delete ${row.name}`}
                  aria-label={`Delete ${row.name}`}
                  onClick={() => setRemoving(row)}
                >
                  <Trash2 size={16} />
                </button>
              </article>
            ))}
        </div>
      )}
      <p className="customize-explainer">
        Skills are private to your OSCAR account and available across your
        projects. OSCAR, Hermes, T3, and Paperclip receive the skills attached
        to a chat. Other connected workspaces can read them through OSCAR MCP.
      </p>
      {editing !== undefined && (
        <Modal
          label={editing ? "Edit skill" : "Add skill"}
          busy={busy}
          onClose={() => setEditing(undefined)}
        >
          <form
            className="customize-editor"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <header>
              <h2>{editing ? "Edit skill" : "Add skill"}</h2>
              <button
                type="button"
                aria-label="Close skill editor"
                className="workspace-icon-button"
                disabled={busy}
                onClick={() => setEditing(undefined)}
              >
                <X size={18} />
              </button>
            </header>
            <label>
              Name
              <input
                required
                maxLength={80}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label>
              Slash command
              <input
                required
                pattern={"[a-z][a-z0-9_\\-]{0,47}"}
                maxLength={48}
                placeholder="clear-plan"
                value={draft.slug}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
              />
              <small>
                Lowercase letters, numbers, hyphens, or underscores. Start with
                a letter.
              </small>
            </label>
            <label>
              Description
              <input
                maxLength={300}
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
              />
            </label>
            <label>
              Instructions
              <textarea
                required
                rows={8}
                maxLength={4000}
                value={draft.instructions}
                onChange={(e) =>
                  setDraft({ ...draft, instructions: e.target.value })
                }
              />
              <small>{draft.instructions.length}/4,000 characters</small>
            </label>
            <p>
              Changes apply to new attachments. Use the command again to update
              a chat to the latest version.
            </p>
            {error && (
              <p role="alert" className="text-red-400">
                {error}
              </p>
            )}
            <footer>
              <button
                type="button"
                className="customize-secondary"
                disabled={busy}
                onClick={() => setEditing(undefined)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="customize-primary"
                disabled={busy}
              >
                {busy ? "Saving…" : "Save skill"}
              </button>
            </footer>
          </form>
        </Modal>
      )}
      {removing && (
        <Modal
          label="Delete skill"
          busy={busy}
          onClose={() => setRemoving(null)}
        >
          <div className="customize-editor">
            <h2>Delete {removing.name}?</h2>
            <p>
              This removes the skill from your library and future chat turns.
              Work already sent to an agent keeps its original instructions.
            </p>
            <footer>
              <button
                className="customize-secondary"
                onClick={() => setRemoving(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                className="customize-primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await skillsApi.remove(removing.id);
                    setRows((r) => r.filter((s) => s.id !== removing.id));
                    setRemoving(null);
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Could not delete skill.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Delete skill
              </button>
            </footer>
            {error && <p role="alert">{error}</p>}
          </div>
        </Modal>
      )}
    </>
  );
}
