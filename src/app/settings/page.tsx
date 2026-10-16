"use client";

import Link from "next/link";
import { WorkspaceAppearance } from "@/context/workspace-theme";
import { AppLayout } from "@/components/app-layout";
import { useAuth } from "@/context/auth-context";

export default function SettingsPage() {
  const { currentProject, user } = useAuth();
  const links = [
    {
      title: "Account",
      description: "Your profile and sign-in settings.",
      href: "/profile",
    },
    {
      title: "Integrations",
      description: "Manage GitHub, Hermes, and other connections.",
      href: "/settings/integrations",
    },
    ...(currentProject
      ? [
          {
            title: "Project settings",
            description: `Sharing and access for ${currentProject.name}.`,
            href: `/projects/${currentProject.id}#settings`,
          },
        ]
      : []),
    ...(user?.systemRole === "ADMIN"
      ? [
          {
            title: "User administration",
            description: "Manage account access when needed.",
            href: "/users",
          },
        ]
      : []),
  ];
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-7">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="mt-2 text-sm text-slate-500">
            Account, connections, and project access.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white"><WorkspaceAppearance /></div>
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block p-5 hover:bg-slate-50 rounded-2xl"
            >
              <h2 className="font-medium">{link.title}</h2>
              <p className="text-sm text-slate-500 mt-1">{link.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
