import { redirect } from "next/navigation";

export default function PlatformsPage() {
  redirect("/settings?section=integrations&app=platforms");
}
