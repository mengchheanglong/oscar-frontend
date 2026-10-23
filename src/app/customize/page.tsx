"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, ChevronRight } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { plugins } from "@/components/customize/customize-sidebar";
import { SkillsLibrary } from "@/components/customize/skills-library";
import { IntegrationsConsole } from "@/components/integrations/integrations-console";
function Customize() {
  const params = useSearchParams(),
    router = useRouter(),
    [query, setQuery] = useState("");
  const section = params.get("section"),
    app = plugins.find((p) => p.id === params.get("app"));
  return (
    <AppLayout>
      <div className="customize-content">
        {section === "skills" ? (
          <SkillsLibrary />
        ) : app ? (
          <>
            <nav className="customize-breadcrumb" aria-label="Breadcrumb">
              <Link href="/customize">Plugins</Link>
              <ChevronRight size={16} />
              <span>{app.name}</span>
            </nav>
            <IntegrationsConsole
              key={app.id}
              initialView={
                app.id as "hermes" | "t3" | "paperclip" | "github" | "mcp"
              }
              onViewChange={() => router.push("/customize")}
            />
          </>
        ) : (
          <>
            <header className="customize-page-header">
              <div>
                <h1>Plugins</h1>
                <p>Connect the tools OSCAR uses to get work done.</p>
              </div>
            </header>
            <div className="customize-search">
              <Search size={18} />
              <input
                aria-label="Search plugins"
                placeholder="Search plugins"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="customize-section-heading">
              <h2>Workspace plugins</h2>
              <span>{plugins.length} available</span>
            </div>
            <div className="customize-grid">
              {plugins
                .filter((p) =>
                  `${p.name} ${p.description}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((p) => (
                  <Link
                    key={p.id}
                    href={`/customize?section=plugins&app=${p.id}`}
                    className="customize-plugin"
                  >
                    <span className="customize-tool-icon">
                      <p.icon size={23} />
                    </span>
                    <span>
                      <strong>{p.name}</strong>
                      <small>{p.description}</small>
                    </span>
                    <ChevronRight size={18} />
                  </Link>
                ))}
            </div>
            <p className="customize-explainer">
              These are OSCAR’s existing integrations. Connection status and
              permissions are managed inside each plugin.
            </p>
          </>
        )}
      </div>
    </AppLayout>
  );
}
export default function CustomizePage() {
  return (
    <Suspense>
      <Customize />
    </Suspense>
  );
}
