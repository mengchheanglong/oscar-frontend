"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { WorkspaceAppearance } from "@/context/workspace-theme";
import { WorkspaceIcon } from "@/components/workspace-icons";

export function GuestChat() {
  const { user, isLoading } = useAuth(),
    router = useRouter();
  const [draft, setDraft] = useState("");
  const textarea = useRef<HTMLTextAreaElement>(null);
  const appearance = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (
        appearance.current &&
        !appearance.current.contains(event.target as Node)
      )
        appearance.current.open = false;
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);
  useEffect(() => {
    if (!isLoading && user) router.replace("/assistant");
  }, [isLoading, user, router]);
  useEffect(() => {
    try {
      setDraft(sessionStorage.getItem("aiw_guest_draft") || "");
    } catch {}
  }, []);
  useEffect(() => {
    const node = textarea.current;
    if (node) {
      node.style.height = "auto";
      node.style.height = `${Math.min(180, Math.max(40, node.scrollHeight))}px`;
    }
  }, [draft]);
  const signIn = (register = false) => {
    try {
      if (draft.trim())
        sessionStorage.setItem("aiw_guest_draft", draft.slice(0, 20000));
      else sessionStorage.removeItem("aiw_guest_draft");
    } catch {}
    router.push(register ? "/login?mode=register" : "/login");
  };
  return (
    <div className="guest-chat">
      <header className="guest-chat-header">
        <Link href="/" aria-label="OSCAR" className="guest-chat-logo">
          <WorkspaceIcon name="mark" />
        </Link>
        <div className="guest-chat-account">
          <details
            ref={appearance}
            className="guest-appearance"
            onKeyDown={(event) => {
              if (event.key === "Escape") event.currentTarget.open = false;
            }}
          >
            <summary aria-label="Appearance settings" title="Appearance">
              <WorkspaceIcon name="settings" />
            </summary>
            <div>
              <WorkspaceAppearance />
            </div>
          </details>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => signIn()}
            className="guest-auth-button"
          >
            Sign in
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => signIn(true)}
            className="guest-auth-button guest-auth-primary"
          >
            Sign up
          </button>
        </div>
      </header>
      <main className="guest-chat-main">
        <h1>What should we explore?</h1>
        <form
          className="chat-composer-box guest-chat-composer"
          onSubmit={(event) => {
            event.preventDefault();
            if (draft.trim()) signIn();
          }}
        >
          <textarea
            ref={textarea}
            aria-label="Message OSCAR"
            placeholder="Ask anything"
            value={draft}
            maxLength={20000}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                if (draft.trim()) signIn();
              }
            }}
            rows={1}
          />
          <div className="chat-composer-actions">
            <button
              type="button"
              aria-label="Sign in to add files"
              title="Sign in to add files"
              onClick={() => signIn()}
              className="workspace-icon-button"
            >
              <WorkspaceIcon name="plus" />
            </button>
            <div className="chat-composer-controls">
              <span className="guest-assistant-label">Assistant</span>
              <button
                type="submit"
                disabled={!draft.trim() || isLoading}
                aria-label="Continue with this message"
                title="Sign in to continue"
                className="chat-send"
              >
                <WorkspaceIcon name="send" />
              </button>
            </div>
          </div>
        </form>
      </main>
      <footer className="guest-chat-footer">
        Sign in to save conversations and work with your files.
      </footer>
    </div>
  );
}
