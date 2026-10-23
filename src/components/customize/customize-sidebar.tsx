"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Blocks,
  Box,
  Bot,
  Code2,
  GitBranch,
  Network,
  Paperclip,
} from "lucide-react";
export const plugins = [
  {
    id: "hermes",
    name: "Hermes Agent",
    description: "Research, calculations, and reviewed project work.",
    icon: Bot,
  },
  {
    id: "t3",
    name: "T3 Code",
    description: "Supervised coding in your connected workspace.",
    icon: Code2,
  },
  {
    id: "paperclip",
    name: "Paperclip",
    description: "Delegate work to your connected company and agents.",
    icon: Paperclip,
  },
  {
    id: "github",
    name: "GitHub",
    description: "Repository sources, issues, and pull requests.",
    icon: GitBranch,
  },
  {
    id: "mcp",
    name: "OSCAR MCP",
    description: "Give connected coding tools access to OSCAR.",
    icon: Network,
  },
];
export function CustomizeSidebar() {
  const params = useSearchParams(),
    section = params.get("section") === "skills" ? "skills" : "plugins",
    app = params.get("app");
  return (
    <aside className="customize-sidebar" aria-label="Customize">
      <Link href="/customize" className="customize-title">
        Customize
      </Link>
      <nav aria-label="Customization sections">
        <Link
          className="customize-link"
          href="/customize?section=plugins"
          aria-current={section === "plugins" && !app ? "page" : undefined}
        >
          <Blocks size={18} />
          Plugins
        </Link>
        <Link
          className="customize-link"
          href="/customize?section=skills"
          aria-current={section === "skills" ? "page" : undefined}
        >
          <Box size={18} />
          Skills
        </Link>
      </nav>
      <p className="customize-group-label">Workspace tools</p>
      <nav aria-label="Available workspace plugins">
        {plugins.map((p) => (
          <Link
            className="customize-link"
            key={p.id}
            href={`/customize?section=plugins&app=${p.id}`}
            aria-current={
              section === "plugins" && app === p.id ? "page" : undefined
            }
          >
            <p.icon size={17} />
            <span>{p.name}</span>
          </Link>
        ))}
      </nav>
      <p className="customize-sidebar-note">
        Manage the tools and skills your agents can use.
      </p>
    </aside>
  );
}
