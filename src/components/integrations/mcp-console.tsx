"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowLeft, Check, CheckSquare, ChevronDown,
  Copy, FileText, GitBranch, KeyRound, RefreshCw, ShieldCheck,
  Sparkles, Terminal, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/utils";

interface AccessToken {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
}

interface EditorGuide {
  id: string;
  name: string;
  icon: React.ReactNode;
  snippets: { id: string; title: string; description: string; code: string; copyLabel: string }[];
}

interface McpConsoleProps {
  logo: React.ReactNode;
  projectKey: string;
  projectName: string;
  apiUrl: string;
  prompt: string;
  editors: EditorGuide[];
  tokens: AccessToken[];
  loadingTokens: boolean;
  tokensError: string | null;
  onBack: () => void;
  onCreateToken: () => void;
  onRevokeToken: (token: AccessToken) => void;
  onReloadTokens: () => void;
  onCopy: (text: string) => Promise<boolean>;
}

const capabilities = [
  { icon: CheckSquare, title: "Tasks", description: "Plan work and keep progress in sync." },
  { icon: FileText, title: "Documents & search", description: "Find answers in your project knowledge." },
  { icon: GitBranch, title: "Decisions", description: "Bring project context into your editor." },
  { icon: Sparkles, title: "AI proposals", description: "Generate drafts to review and confirm." },
];

export function McpConsole({
  logo, projectKey, projectName, apiUrl, prompt, editors, tokens,
  loadingTokens, tokensError, onBack, onCreateToken, onRevokeToken,
  onReloadTokens, onCopy,
}: McpConsoleProps) {
  const [setupMode, setSetupMode] = useState<"prompt" | "manual">("prompt");
  const [editorId, setEditorId] = useState("codex");
  const [copied, setCopied] = useState<string | null>(null);
  const editor = editors.find((item) => item.id === editorId) || editors[0];
  const verificationPrompt = `Use the Continuum MCP server to list tasks for project "${projectKey}".`;

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function copy(text: string, id: string) {
    if (await onCopy(text)) setCopied(id);
  }

  return (
    <div className="relative space-y-6 animate-in fade-in duration-200">
      <div className="space-y-5">
        <button type="button" onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded text-xs font-medium text-slate-500 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-codex-accent">
          <ArrowLeft className="h-3.5 w-3.5" /> Integrations
        </button>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-codex-accent">
            {logo}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="font-serif text-2xl font-bold tracking-tight text-slate-900">Coding agents & MCP</h1>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-500">Model Context Protocol</span>
            </div>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
              Bring your workspace into the editor you already use.
            </p>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_260px] xl:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-labelledby="mcp-setup-heading" className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
            <Terminal className="h-5 w-5 text-codex-accent" />
            <div>
              <h2 id="mcp-setup-heading" className="text-base font-semibold text-slate-900">Connect your agent</h2>
              <p className="mt-1 text-xs text-slate-500">Three steps to start working with {projectKey}.</p>
            </div>
          </div>
          <ol className="divide-y divide-slate-100 px-5 sm:px-6">
            <li className="relative py-6 pl-11">
              <span className="absolute left-0 top-6 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">1</span>
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Get an access token</h3>
                  <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">Use a token you saved, or create one for this agent.</p>
                </div>
                <Button variant="outline" onClick={onCreateToken} className="shrink-0 gap-2 rounded-lg">
                  <KeyRound className="h-3.5 w-3.5" /> Create token
                </Button>
              </div>
            </li>

            <li className="relative py-6 pl-11">
              <span className="absolute left-0 top-6 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">2</span>
              <h3 className="text-sm font-semibold text-slate-900">Set up your coding agent</h3>
              <div className="mt-4 inline-flex max-w-full rounded-lg bg-slate-100 p-1" role="group" aria-label="Setup method">
                {([
                  { id: "prompt", label: "Use a prompt" },
                  { id: "manual", label: "Manual setup" },
                ] as const).map((mode) => (
                  <button key={mode.id} type="button" aria-pressed={setupMode === mode.id}
                    onClick={() => setSetupMode(mode.id)}
                    className={`rounded-md px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-codex-accent ${setupMode === mode.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>
                    {mode.label}
                  </button>
                ))}
              </div>

              {setupMode === "prompt" ? (
                <div className="mt-4 space-y-4">
                  <p className="text-xs leading-relaxed text-slate-500">
                    Paste the setup prompt into Cursor, Claude Code, Codex, or Antigravity.
                    Your agent will walk you through the connection.
                  </p>
                  <Button onClick={() => copy(prompt, "prompt")} className="w-full gap-2 rounded-lg sm:w-auto">
                    {copied === "prompt" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied === "prompt" ? "Prompt copied" : "Copy setup prompt"}
                  </Button>
                  <p className="text-[11px] text-slate-400">Have your access token and backend path ready.</p>
                  <details className="group overflow-hidden rounded-lg border border-slate-200">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-xs text-slate-500 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                      View setup prompt <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" />
                    </summary>
                    <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words border-t border-slate-200 bg-slate-50 p-4 font-mono text-[11px] leading-relaxed text-slate-600">{prompt}</pre>
                  </details>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-2" role="group" aria-label="Coding editor">
                    {editors.map((item) => (
                      <button key={item.id} type="button" aria-pressed={editor.id === item.id}
                        onClick={() => setEditorId(item.id)}
                        className={`flex min-w-0 items-center gap-2 rounded-lg border px-3 py-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-codex-accent ${editor.id === item.id ? "border-codex-accent bg-indigo-50 text-codex-accent" : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}>
                        <span className="shrink-0">{item.icon}</span>
                        <span className="min-w-0 text-left leading-relaxed">{item.name}</span>
                        {editor.id === item.id && <Check className="ml-auto h-3.5 w-3.5 shrink-0" />}
                      </button>
                    ))}
                  </div>
                  {editor.snippets.map((snippet) => (
                    <div key={snippet.id} className="space-y-2">
                      <p className="text-xs leading-relaxed text-slate-500">{snippet.description}</p>
                      <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-3 py-2">
                          <span className="min-w-0 break-all font-mono text-[11px] text-slate-400">{snippet.title}</span>
                          <button type="button" onClick={() => copy(snippet.code, snippet.id)}
                            aria-label={`${snippet.copyLabel} for ${editor.name}`}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
                            {copied === snippet.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                            {copied === snippet.id ? "Copied" : snippet.copyLabel}
                          </button>
                        </div>
                        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-[11px] leading-relaxed text-slate-200">{snippet.code}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </li>

            <li className="relative py-6 pl-11">
              <span className="absolute left-0 top-6 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">3</span>
              <h3 className="text-sm font-semibold text-slate-900">Verify the connection</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">Ask your agent to fetch the project’s tasks:</p>
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <code className="min-w-0 flex-1 break-words text-[11px] leading-relaxed text-slate-600">{verificationPrompt}</code>
                <button type="button" onClick={() => copy(verificationPrompt, "verify")} aria-label="Copy verification prompt"
                  className="shrink-0 rounded p-1 text-slate-400 hover:bg-white hover:text-codex-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-codex-accent">
                  {copied === "verify" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-400">A task list from {projectKey}, including an empty list, confirms the connection.</p>
            </li>
          </ol>
        </section>

        <aside className="grid min-w-0 gap-5 md:grid-cols-2 lg:grid-cols-1" aria-label="MCP workspace information">
          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900">Connection details</h2>
            <dl className="mt-5 space-y-4">
              <div>
                <dt className="text-[11px] text-slate-400">Project</dt>
                <dd className="mt-1.5 flex items-center gap-2 text-xs font-medium text-slate-700">
                  <span className="shrink-0 rounded-md bg-indigo-50 px-2 py-1 font-mono text-codex-accent">{projectKey}</span>
                  <span className="min-w-0 break-words">{projectName}</span>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-400">API endpoint</dt>
                <dd className="mt-1.5 break-all font-mono text-[11px] leading-relaxed text-slate-600">{apiUrl}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-slate-100 pt-4">
                <dt className="text-xs text-slate-500">Server transport</dt>
                <dd className="text-xs font-medium text-slate-700">Local stdio</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-xs text-slate-500">Authentication</dt>
                <dd className="text-xs font-medium text-slate-700">Access token</dd>
              </div>
            </dl>
            <div className="mt-5 flex items-start gap-2 rounded-lg bg-slate-50 p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <p className="text-[11px] leading-relaxed text-slate-500">Your agent uses your workspace permissions.</p>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center">
              <h2 className="text-sm font-semibold text-slate-900">Workspace tools</h2>
            </div>
            <div className="mt-5 space-y-5">
              {capabilities.map(({ icon: Icon, title, description }) => (
                <div key={title} className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <h3 className="text-xs font-medium text-slate-700">{title}</h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{description}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 border-t border-slate-100 pt-4 text-[11px] leading-relaxed text-slate-400">Also includes GitHub issues and workspace activity.</p>
          </section>
        </aside>
      </div>

      <section aria-labelledby="mcp-tokens-heading" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="mcp-tokens-heading" className="text-base font-semibold text-slate-900">Your access tokens</h2>
              {!loadingTokens && !tokensError && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">{tokens.length}</span>}
            </div>
            <p className="mt-1 text-xs text-slate-500">Personal tokens for your coding agents. Full tokens are shown only when created.</p>
          </div>
          <Button variant="outline" onClick={onCreateToken} className="shrink-0 gap-2"><KeyRound className="h-3.5 w-3.5" /> Create token</Button>
        </div>
        {loadingTokens ? (
          <div className="space-y-3 p-6" aria-label="Loading access tokens" role="status">
            <div className="h-12 animate-pulse rounded-lg bg-slate-50" />
            <div className="h-12 animate-pulse rounded-lg bg-slate-50" />
          </div>
        ) : tokensError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center" role="alert">
            <p className="text-sm font-medium text-slate-700">Couldn’t load access tokens</p>
            <p className="text-xs text-slate-500">{tokensError}</p>
            <Button variant="outline" onClick={onReloadTokens} className="gap-2"><RefreshCw className="h-3.5 w-3.5" /> Try again</Button>
          </div>
        ) : tokens.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <div className="rounded-xl bg-indigo-50 p-3 text-codex-accent"><KeyRound className="h-5 w-5" /></div>
            <p className="text-sm font-medium text-slate-700">Your first connection starts here</p>
            <p className="max-w-sm text-xs leading-relaxed text-slate-500">Create a personal access token, then use the setup guide above to connect your agent.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {tokens.map((token) => {
              const expired = Boolean(token.expiresAt && Date.parse(token.expiresAt) <= Date.now());
              return (
                <li key={token.id} className="relative grid grid-cols-2 gap-4 px-5 py-5 md:grid-cols-[minmax(0,1fr)_140px_130px_80px] md:items-center sm:px-6">
                  <div className="col-span-2 min-w-0 pr-20 md:col-span-1 md:pr-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words text-sm font-medium text-slate-800">{token.name}</p>
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${expired ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{expired ? "Expired" : "Active"}</span>
                    </div>
                    <p className="mt-1.5 break-all font-mono text-[11px] text-slate-400">{token.keyPrefix}••••</p>
                    <p className="mt-1 text-[11px] text-slate-400">Created {formatDate(token.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Last used</p>
                    <p className="mt-1 text-xs text-slate-600">{token.lastUsedAt ? formatDateTime(token.lastUsedAt) : "Not used yet"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Expires</p>
                    <p className={`mt-1 text-xs ${expired ? "text-amber-700" : "text-slate-600"}`}>{token.expiresAt ? formatDate(token.expiresAt) : "No expiration"}</p>
                  </div>
                  <button type="button" onClick={() => onRevokeToken(token)} aria-label={`Revoke ${token.name}`}
                    className="absolute right-5 top-5 inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs text-slate-500 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 md:static sm:right-6">
                    <Trash2 className="h-3.5 w-3.5" /> Revoke
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex items-start gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3 sm:px-6">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <p className="text-[11px] leading-relaxed text-slate-400">Keep tokens out of source control. Revoke a token to remove that agent’s access.</p>
        </div>
      </section>
      <p className="sr-only" role="status" aria-live="polite">{copied ? "Copied to clipboard" : ""}</p>
    </div>
  );
}
