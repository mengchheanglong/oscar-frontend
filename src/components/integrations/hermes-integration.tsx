"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot } from "lucide-react";
import { agentRuns } from "@/lib/agent-runs";
import { Button } from "@/components/ui/button";

export function HermesIntegration({ projectId, detail = false, onOpen, onBack }: {
  projectId?: string;
  detail?: boolean;
  onOpen?: () => void;
  onBack?: () => void;
}) {
  const [check, setCheck] = useState<{ projectId: string; available?: boolean; error?: boolean }>();
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let disposed = false;
    setCheck(undefined);
    if (projectId) {
      agentRuns.status(projectId).then(
        (status) => { if (!disposed) setCheck({ projectId, available: status.available }); },
        () => { if (!disposed) setCheck({ projectId, error: true }); },
      );
    }
    return () => { disposed = true; };
  }, [projectId, refresh]);

  const current = check?.projectId === projectId ? check : undefined;
  const label = !projectId ? "Select a project" : !current ? "Checking configuration…"
    : current.error ? "Status unavailable" : current.available ? "Configured" : "Not configured";

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      {detail && <Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />All integrations</Button>}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><Bot className="h-6 w-6" /></div>
          <div><h2 className="font-serif text-sm font-bold text-slate-900">Hermes Agent</h2><p className="text-xs text-slate-500">External agent runtime</p></div>
        </div>
        <span role="status" className={`rounded-full border px-2.5 py-1 text-xs ${current?.available ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{label}</span>
      </div>
      <p className="text-sm text-slate-600">Use Hermes in Copilot’s Agent work to research project evidence, calculate pricing scenarios, and prepare task drafts for your review.</p>
      {detail && <>
        <p className="text-sm text-slate-600">Runs stay scoped to your selected project. Your run history and reports are private, and task drafts require review before they become project changes.</p>
        <p className="text-xs text-slate-500">This status checks workspace configuration. Provider availability is checked when a run starts.</p>
        {current?.available === false && <p className="text-sm text-slate-600">Ask your workspace operator to configure the Hermes runtime before starting agent work.</p>}
        {current?.error && <p className="text-sm text-red-700">Could not check the runtime. Refresh to try again.</p>}
      </>}
      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        {detail ? <>
          {projectId && <Button variant="outline" onClick={() => setRefresh((value) => value + 1)}>Refresh status</Button>}
          {current?.available && <Link href="/assistant" className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white">Open Copilot</Link>}
          <a href="https://github.com/NousResearch/hermes-agent" target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-2 text-sm text-blue-700">Hermes source</a>
        </> : <Button variant="outline" onClick={onOpen}>View integration</Button>}
      </div>
    </section>
  );
}
