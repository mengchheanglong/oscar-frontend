import { Suspense } from "react";
import SettingsWorkspace from "@/components/settings-workspace";
export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div role="status" className="workspace-loading">
          Loading settings…
        </div>
      }
    >
      <SettingsWorkspace />
    </Suspense>
  );
}
