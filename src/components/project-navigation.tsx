"use client";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
export function ProjectNavigation({ active }: { active: string }) {
  const { currentProject } = useAuth();
  if (!currentProject) return null;
  const base = `/projects/${currentProject.id}`;
  const links = [
    ["Overview", base],
    ["Tasks", "/tasks"],
    ["Files", "/documents"],
    ["Decisions", "/decisions"],
    ["Settings", `${base}#settings`],
  ];
  return (
    <nav
      aria-label="Project navigation"
      className="flex flex-wrap gap-1 border-b border-slate-200 pb-3 mb-6"
    >
      <span className="w-full text-xs text-slate-500 mb-2">
        {currentProject.name}
      </span>
      {links.map(([label, href]) => (
        <Link
          key={label}
          href={href}
          aria-current={label === active ? "page" : undefined}
          className={`rounded-lg px-3 py-2 text-sm ${label === active ? "bg-white font-medium text-slate-900 shadow-sm" : "text-slate-500 hover:bg-white/70"}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
