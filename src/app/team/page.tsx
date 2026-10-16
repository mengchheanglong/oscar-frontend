"use client";

import React from "react";
import { AppLayout } from "@/components/app-layout";
import { TeamManagement } from "@/components/team/team-management";

export default function TeamPage() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl p-4 sm:p-6 md:p-8">
        <TeamManagement inSettings={false} />
      </div>
    </AppLayout>
  );
}
