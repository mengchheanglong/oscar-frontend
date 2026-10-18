"use client";
import { Suspense } from "react";
import SettingsWorkspace from "@/components/settings-workspace";
export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div role="status" className="workspace-loading">
          Loading settings…
        </div>
      }
    >
      <SettingsWorkspace initialTab="integrations" />
    </Suspense>
  );
}
