"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Box, X } from "lucide-react";
import { skillsApi, type Skill } from "@/lib/skills-api";
export function ChatSkills({
  projectId,
  conversationId,
  value,
  onChange,
  busy,
}: {
  projectId?: string;
  conversationId?: string;
  value: string;
  onChange: (value: string) => void;
  busy: boolean;
}) {
  const [library, setLibrary] = useState<Skill[]>([]),
    [attached, setAttached] = useState<Skill[]>([]),
    [error, setError] = useState(""),
    [removing, setRemoving] = useState(false);
  const command = /^\/[a-z0-9_-]*$/.test(value),
    filter = value.slice(1).toLowerCase();
  useEffect(() => {
    if (!command) return;
    let alive = true;
    skillsApi
      .list()
      .then((r) => {
        if (alive) {
          setLibrary(r);
          setError("");
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [command]);
  useEffect(() => {
    if (!projectId || !conversationId) {
      setAttached([]);
      return;
    }
    if (busy) return;
    setError("");
    let alive = true;
    skillsApi
      .attached(projectId, conversationId)
      .then((r) => {
        if (alive) setAttached(r);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [projectId, conversationId, busy]);
  return (
    <div className="chat-skills">
      {command && (
        <div className="chat-skill-picker" aria-label="Choose a skill">
          <div className="chat-skill-picker-heading">
            <span>Skills</span>
            <Link href="/customize?section=skills">Manage</Link>
          </div>
          {library
            .filter((s) => s.slug.startsWith(filter))
            .map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onChange(`/${s.slug} `)}
              >
                <Box size={17} />
                <span>
                  <strong>/{s.slug}</strong>
                  <small>{s.description}</small>
                </span>
              </button>
            ))}
          {!library.some((s) => s.slug.startsWith(filter)) && (
            <p>No matching skills. Add one in Customize.</p>
          )}
        </div>
      )}
      {attached.length > 0 && (
        <div
          className="chat-skill-chips"
          aria-label="Skills attached to this chat"
        >
          {attached.map((s) => (
            <span
              key={s.id}
              title={`${s.name}, version ${s.version}. Available when relevant in this chat and delegated work.`}
            >
              <Box size={13} />/{s.slug}
              <button
                type="button"
                aria-label={`Remove ${s.name} from this chat`}
                disabled={busy || removing}
                onClick={async () => {
                  if (!projectId || !conversationId) return;
                  setRemoving(true);
                  try {
                    await skillsApi.detach(projectId, conversationId, s.id);
                    setAttached((old) => old.filter((r) => r.id !== s.id));
                    setError("");
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Could not remove skill.",
                    );
                  } finally {
                    setRemoving(false);
                  }
                }}
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
      {error && (
        <p role="status" className="text-xs text-muted-foreground">
          Skills: {error}
        </p>
      )}
    </div>
  );
}
