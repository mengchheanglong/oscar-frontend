"use client";
import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { DeleteConfirmModal } from "@/components/delete-confirm-modal";

type Member = {
  userId: string;
  accessRole: string;
  user: { displayName: string; email: string };
};
export function ProjectAccess({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [remove, setRemove] = useState<Member | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    api.projects
      .getMembers(projectId)
      .then((rows) => {
        if (live) setMembers(rows);
      })
      .catch(() => {
        if (live) setError("Could not load project members.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [projectId, revision]);
  const role = members.find((m) => m.userId === user?.id)?.accessRole;
  const canManage = role === "OWNER" || role === "MANAGER";
  async function add(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await api.projects.addMember(projectId, {
        email: email.trim(),
        accessRole: "CONTRIBUTOR",
      });
      setEmail("");
      setRevision((r) => r + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add member.");
    } finally {
      setBusy(false);
    }
  }
  async function change(member: Member, accessRole: string) {
    setBusy(true);
    setError("");
    try {
      await api.projects.updateMemberRole(projectId, member.userId, {
        accessRole,
      });
      setRevision((r) => r + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update access.");
    } finally {
      setBusy(false);
    }
  }
  async function confirmRemove() {
    if (!remove) return;
    setBusy(true);
    setError("");
    try {
      await api.projects.removeMember(projectId, remove.userId);
      setRemove(null);
      setRevision((r) => r + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove access.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <h3 className="font-medium">People and access</h3>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}{" "}
          <button
            className="underline"
            onClick={() => {
              setError("");
              setRevision((r) => r + 1);
            }}
          >
            Reload
          </button>
        </p>
      )}
      {loading ? (
        <p className="text-sm text-slate-500">Loading members…</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {members.map((member) => (
            <li
              key={member.userId}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div>
                <p className="text-sm font-medium">{member.user.displayName}</p>
                <p className="text-xs text-slate-500">{member.user.email}</p>
              </div>
              {canManage &&
              member.accessRole !== "OWNER" &&
              member.userId !== user?.id &&
              (role === "OWNER" || member.accessRole !== "MANAGER") ? (
                <div className="flex gap-3">
                  <select
                    aria-label={`Access for ${member.user.displayName}`}
                    disabled={busy}
                    value={member.accessRole}
                    onChange={(e) => change(member, e.target.value)}
                    className="border rounded-lg px-2 py-1 text-sm"
                  >
                    {[
                      "VIEWER",
                      "CONTRIBUTOR",
                      ...(role === "OWNER" ? ["MANAGER"] : []),
                    ].map((value) => (
                      <option key={value} value={value}>
                        {value.toLowerCase()}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={busy}
                    className="text-sm text-red-700"
                    onClick={() => setRemove(member)}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <span className="text-xs text-slate-500 lowercase">
                  {member.accessRole}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {canManage && (
        <form onSubmit={add} className="space-y-2">
          <label htmlFor="member-email" className="text-sm text-slate-500">
            Add someone with an existing account
          </label>
          <div className="flex gap-2">
            <input
              id="member-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"
            />
            <button
              disabled={busy || !email.trim()}
              className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm disabled:opacity-40"
            >
              Add member
            </button>
          </div>
        </form>
      )}
      <DeleteConfirmModal
        isOpen={!!remove}
        onClose={() => !busy && setRemove(null)}
        onConfirm={confirmRemove}
        title="Remove project access?"
        itemName={remove?.user.displayName}
        warningText="This removes access to this project. Their account and other projects remain available."
        confirmText="Remove access"
        loading={busy}
      />
    </section>
  );
}
