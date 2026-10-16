"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  FilePlus2,
  FolderPlus,
  Maximize2,
  Minimize2,
  Pencil,
  Settings2,
  FileText,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth, type Project } from "@/context/auth-context";
import { WorkspaceIcon } from "@/components/workspace-icons";
import { WorkspaceDialog, FloatingMenu } from "@/components/workspace-overlays";
import { UploadedFolderSources } from "@/components/uploaded-folder-sources";

type PanelTab = "settings" | "files";
type Edit = { kind: "rename" | "icon" | "archive"; project: Project };
interface WorkspaceState {
  openCreate: () => void;
  openArchives: () => void;
  openPanel: (project: Project, tab?: PanelTab) => void;
  editProject: (kind: Edit["kind"], project: Project) => void;
  panelProject: Project | null;
  panelTab: PanelTab;
  setPanelTab: (tab: PanelTab) => void;
  closePanel: () => void;
  saveProject: (
    project: Project,
    changes: {
      name?: string;
      icon?: string | null;
      instructions?: string | null;
    },
  ) => Promise<Project>;
  pendingFolder: File[] | null;
  consumeFolder: () => void;
}
const WorkspaceContext = createContext<WorkspaceState | null>(null);
export function useProjectWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("Project workspace provider is missing");
  return value;
}
const emojiIcons = [
  "📁",
  "🎈",
  "🔒",
  "📈",
  "💼",
  "💡",
  "🧪",
  "📚",
  "🌍",
  "🛠️",
  "🎯",
  "🚀",
];
export function ProjectGlyph({ project }: { project: Pick<Project, "icon"> }) {
  return project.icon ? (
    <span className="project-emoji" aria-hidden="true">
      {project.icon}
    </span>
  ) : (
    <WorkspaceIcon name="folder" />
  );
}
function errorText(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Could not save. Please try again.";
}
export function ProjectWorkspaceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user, currentProject, setCurrentProject, projects, refreshProjects } =
      useAuth(),
    router = useRouter();
  const currentRef = useRef(currentProject);
  currentRef.current = currentProject;
  const [createOpen, setCreateOpen] = useState(false),
    [archivesOpen, setArchivesOpen] = useState(false),
    [edit, setEdit] = useState<Edit | null>(null),
    [panelProject, setPanelProject] = useState<Project | null>(null),
    [panelTab, setPanelTab] = useState<PanelTab>("settings"),
    [pendingFolder, setPendingFolder] = useState<File[] | null>(null);
  useEffect(() => {
    setCreateOpen(false);
    setArchivesOpen(false);
    setEdit(null);
    setPanelProject(null);
    setPendingFolder(null);
  }, [user?.id]);
  const selectedProjectId = currentProject?.id;
  const panelProjectScope = panelProject?.id;
  useEffect(() => {
    if (panelProjectScope && panelProjectScope !== selectedProjectId) {
      setPanelProject(null);
      setPendingFolder(null);
    }
  }, [selectedProjectId, panelProjectScope]);
  const openPanel = useCallback(
    (project: Project, tab: PanelTab = "settings") => {
      setCurrentProject(project);
      router.push("/assistant");
      setPanelProject(project);
      setPanelTab(tab);
    },
    [setCurrentProject, router],
  );
  const saveProject = async (
    project: Project,
    changes: {
      name?: string;
      icon?: string | null;
      instructions?: string | null;
    },
  ) => {
    const saved = (await api.projects.update(project.id, {
      ...changes,
      version: project.version,
    })) as Project;
    await refreshProjects();
    if (currentRef.current?.id === project.id) setCurrentProject(saved);
    setPanelProject((previous) =>
      previous?.id === saved.id ? saved : previous,
    );
    return saved;
  };
  const consumeFolder = useCallback(() => setPendingFolder(null), []);
  return (
    <WorkspaceContext.Provider
      value={{
        openCreate: () => setCreateOpen(true),
        openArchives: () => setArchivesOpen(true),
        openPanel,
        editProject: (kind, project) => setEdit({ kind, project }),
        panelProject,
        panelTab,
        setPanelTab,
        closePanel: () => {
          setPanelProject(null);
          setPendingFolder(null);
        },
        saveProject,
        pendingFolder,
        consumeFolder,
      }}
    >
      {children}
      {user && (
        <>
          <CreateProjectDialog
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            onCreated={(project, folder) => {
              setCurrentProject(project);
              router.push("/assistant");
              if (folder?.length) {
                setPendingFolder(folder);
                openPanel(project, "files");
              }
              setCreateOpen(false);
            }}
          />
          {edit && (
            <ProjectEditDialog
              key={`${edit.kind}:${edit.project.id}`}
              edit={edit}
              onClose={() => setEdit(null)}
            />
          )}
          <ArchiveProjectsDialog
            open={archivesOpen}
            onClose={() => setArchivesOpen(false)}
          />
        </>
      )}
    </WorkspaceContext.Provider>
  );
}
function CreateProjectDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (project: Project, folder: File[] | null) => void;
}) {
  const { refreshProjects, setCurrentProject } = useAuth();
  const [name, setName] = useState(""),
    [files, setFiles] = useState<File[]>([]),
    [folder, setFolder] = useState<File[] | null>(null),
    [created, setCreated] = useState<Project | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [progress, setProgress] = useState(""),
    [addOpen, setAddOpen] = useState(false);
  const addButton = useRef<HTMLButtonElement>(null),
    fileInput = useRef<HTMLInputElement>(null),
    folderInput = useRef<HTMLInputElement>(null),
    remaining = useRef<File[]>([]);
  useEffect(() => {
    if (!open) return;
    setName("");
    setFiles([]);
    setFolder(null);
    setCreated(null);
    setError("");
    setProgress("");
    setAddOpen(false);
    remaining.current = [];
  }, [open]);
  useEffect(() => {
    folderInput.current?.setAttribute("webkitdirectory", "");
  }, [open]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !name.trim()) return;
    setBusy(true);
    setError("");
    let project = created;
    try {
      if (!project) {
        for (let attempt = 0; attempt < 3; attempt++) {
          const prefix =
            name
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, "")
              .slice(0, 3) || "PRJ";
          try {
            project = await api.projects.create({
              name: name.trim(),
              key:
                prefix +
                crypto.randomUUID().replace(/-/g, "").slice(0, 5).toUpperCase(),
            });
            break;
          } catch (error) {
            if (
              (error as { code?: string }).code !== "PROJECT_KEY_EXISTS" ||
              attempt === 2
            )
              throw error;
          }
        }
        if (!project) throw new Error("Project was not created.");
        setCreated(project);
        remaining.current = [...files];
        await refreshProjects();
        setCurrentProject(project);
      }
      while (remaining.current.length) {
        const file = remaining.current[0];
        setProgress(
          `Uploading ${files.length - remaining.current.length + 1} of ${files.length} files…`,
        );
        const form = new FormData();
        form.append("file", file);
        form.append("title", file.name);
        await api.documents.upload(project.id, form);
        remaining.current.shift();
      }
      onCreated(project, folder);
    } catch (error) {
      setError(`${project ? "Project created. " : ""}${errorText(error)}`);
    } finally {
      setBusy(false);
      setProgress("");
    }
  }
  return (
    <WorkspaceDialog
      open={open}
      title="Create Project"
      busy={busy}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="workspace-dialog-body">
          <label className="workspace-field-label" htmlFor="quick-project-name">
            Project name
          </label>
          <input
            id="quick-project-name"
            aria-label="Project name"
            autoFocus
            required
            maxLength={100}
            value={name}
            disabled={busy || !!created}
            onChange={(event) => setName(event.target.value)}
            placeholder="New project"
            className="workspace-name-input"
          />
          {files.length > 0 && (
            <p className="project-staged-files">
              {files.length} {files.length === 1 ? "file" : "files"} selected{" "}
              <button
                type="button"
                disabled={busy || !!created}
                onClick={() => setFiles([])}
              >
                Clear
              </button>
            </p>
          )}
          {folder?.length && (
            <p className="project-staged-files">
              {folder[0].webkitRelativePath.split("/")[0]} · {folder.length}{" "}
              files{" "}
              <button
                type="button"
                disabled={busy}
                onClick={() => setFolder(null)}
              >
                Remove
              </button>
            </p>
          )}
          {(files.length > 0 || folder?.length) && (
            <p className="workspace-subtle">
              Files are shared with project members. Folder copies stay private
              to you.
            </p>
          )}
          {error && (
            <p role="alert" className="workspace-form-error">
              {error}
            </p>
          )}
          {progress && (
            <p role="status" className="workspace-subtle">
              {progress}
            </p>
          )}
        </div>
        <div className="workspace-dialog-footer">
          <div>
            <button
              ref={addButton}
              type="button"
              aria-label="Add project files"
              aria-expanded={addOpen}
              disabled={busy || !!created}
              onClick={() => setAddOpen((value) => !value)}
              className="workspace-pill"
            >
              <FilePlus2 size={17} />
              Add
            </button>
            {addOpen && (
              <FloatingMenu
                anchor={addButton}
                onClose={() => setAddOpen(false)}
                placement="bottom"
                label="Add project context"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAddOpen(false);
                    fileInput.current?.click();
                  }}
                >
                  <FilePlus2 />
                  Choose files
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAddOpen(false);
                    folderInput.current?.click();
                  }}
                >
                  <FolderPlus />
                  Choose folder
                </button>
              </FloatingMenu>
            )}
            <input
              ref={fileInput}
              type="file"
              multiple
              className="hidden"
              aria-label="Choose initial project files"
              onChange={(event) => {
                const selectedFiles = Array.from(event.target.files || []);
                setFiles((previous) => [...previous, ...selectedFiles]);
                event.target.value = "";
              }}
            />
            <input
              ref={folderInput}
              type="file"
              multiple
              className="hidden"
              aria-label="Choose initial project folder"
              onChange={(event) => {
                setFolder(Array.from(event.target.files || []));
                event.target.value = "";
              }}
            />
          </div>
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="workspace-pill workspace-pill-primary"
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : created ? (
              "Retry uploads"
            ) : (
              "Create"
            )}
          </button>
        </div>
      </form>
    </WorkspaceDialog>
  );
}
function ProjectEditDialog({
  edit,
  onClose,
}: {
  edit: Edit;
  onClose: () => void;
}) {
  const { saveProject, closePanel } = useProjectWorkspace(),
    { refreshProjects, currentProject, setCurrentProject } = useAuth();
  const [value, setValue] = useState(edit.project.name),
    [icon, setIcon] = useState(edit.project.icon || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (edit.kind === "archive") {
        await api.projects.archive(edit.project.id);
        closePanel();
        if (currentProject?.id === edit.project.id) setCurrentProject(null);
        await refreshProjects();
      } else
        await saveProject(
          edit.project,
          edit.kind === "rename"
            ? { name: value.trim() }
            : { icon: icon || null },
        );
      onClose();
    } catch (error) {
      setError(errorText(error));
      await refreshProjects();
    } finally {
      setBusy(false);
    }
  }
  const title =
    edit.kind === "rename"
      ? "Rename project"
      : edit.kind === "icon"
        ? "Edit project icon"
        : "Archive project";
  return (
    <WorkspaceDialog open title={title} onClose={onClose} busy={busy}>
      <form onSubmit={save}>
        <div className="workspace-dialog-body">
          {edit.kind === "rename" ? (
            <input
              autoFocus
              aria-label="Project name"
              required
              maxLength={100}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="workspace-name-input"
            />
          ) : edit.kind === "icon" ? (
            <div className="workspace-icon-grid">
              <button
                type="button"
                aria-label="Use default folder icon"
                aria-pressed={!icon}
                onClick={() => setIcon("")}
              >
                <WorkspaceIcon name="folder" />
              </button>
              {emojiIcons.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  aria-label={`Use ${emoji} icon`}
                  aria-pressed={icon === emoji}
                  onClick={() => setIcon(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : (
            <p>
              Archive “{edit.project.name}”? Its content stays available and
              becomes read-only. You can restore it from Archived projects.
            </p>
          )}
          {error && (
            <p role="alert" className="workspace-form-error">
              {error}
            </p>
          )}
        </div>
        <div className="workspace-dialog-footer justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="workspace-pill"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || (edit.kind === "rename" && !value.trim())}
            className="workspace-pill workspace-pill-primary"
          >
            {busy ? "Saving…" : edit.kind === "archive" ? "Archive" : "Save"}
          </button>
        </div>
      </form>
    </WorkspaceDialog>
  );
}
function ArchiveProjectsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { projects, refreshProjects } = useAuth();
  const [busy, setBusy] = useState<string | null>(null),
    [error, setError] = useState("");
  async function restore(project: Project) {
    setBusy(project.id);
    setError("");
    try {
      await api.projects.unarchive(project.id);
      await refreshProjects();
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(null);
    }
  }
  return (
    <WorkspaceDialog
      open={open}
      title="Archived projects"
      onClose={onClose}
      busy={!!busy}
    >
      <div className="workspace-dialog-body">
        {projects
          .filter((project) => project.status === "ARCHIVED")
          .map((project) => (
            <div key={project.id} className="project-archive-row">
              <span>
                <ProjectGlyph project={project} />
                {project.name}
              </span>
              <button
                type="button"
                disabled={!!busy || project.currentUserRole !== "OWNER"}
                onClick={() => void restore(project)}
                className="workspace-pill"
              >
                <ArchiveRestore size={16} />
                Restore
              </button>
            </div>
          ))}
        {!projects.some((project) => project.status === "ARCHIVED") && (
          <p className="workspace-subtle">No archived projects.</p>
        )}
        {error && (
          <p role="alert" className="workspace-form-error">
            {error}
          </p>
        )}
      </div>
    </WorkspaceDialog>
  );
}
export function ProjectActions({
  project,
  onNewChat,
}: {
  project: Project;
  onNewChat?: () => void;
}) {
  const workspace = useProjectWorkspace(),
    button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const manage = ["OWNER", "MANAGER"].includes(project.currentUserRole || "");
  const action = (run: () => void) => {
    setOpen(false);
    run();
  };
  return (
    <div className="project-row-actions">
      {onNewChat && (
        <button
          type="button"
          className="project-mini-action"
          title="New chat in project"
          aria-label={`New chat in ${project.name}`}
          onClick={onNewChat}
        >
          <WorkspaceIcon name="plus" />
        </button>
      )}
      <button
        ref={button}
        type="button"
        className="project-mini-action"
        aria-label={`Project menu for ${project.name}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        •••
      </button>
      {open && (
        <FloatingMenu
          anchor={button}
          onClose={() => setOpen(false)}
          label={`${project.name} actions`}
        >
          <button
            role="menuitem"
            disabled={!manage}
            onClick={() =>
              action(() => workspace.editProject("rename", project))
            }
          >
            <Pencil />
            Rename
          </button>
          <button
            role="menuitem"
            onClick={() => action(() => workspace.openPanel(project))}
          >
            <Settings2 />
            Settings
          </button>
          <div className="workspace-menu-divider" />
          <button
            role="menuitem"
            disabled={project.currentUserRole !== "OWNER"}
            onClick={() =>
              action(() => workspace.editProject("archive", project))
            }
          >
            <Archive />
            Archive
          </button>
        </FloatingMenu>
      )}
    </div>
  );
}
export function ProjectSidePanel() {
  const workspace = useProjectWorkspace(),
    { panelProject: project, panelTab, setPanelTab, closePanel } = workspace;
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLElement>(null),
    closeRef = useRef(closePanel);
  closeRef.current = closePanel;
  const panelProjectId = project?.id;
  useEffect(() => {
    if (!panelProjectId) return;
    const panel = panelRef.current;
    if (!panel) return;
    const previous = document.activeElement as HTMLElement | null;
    const mobile = window.matchMedia("(max-width: 900px)");
    const siblings = Array.from(
      document.querySelectorAll<HTMLElement>("main, .workspace-sidebar"),
    );
    const update = () => {
      for (const node of siblings) node.inert = mobile.matches;
      panel.setAttribute("role", mobile.matches ? "dialog" : "complementary");
      if (mobile.matches) {
        panel.setAttribute("aria-modal", "true");
        panel.querySelector<HTMLButtonElement>("button")?.focus();
      } else panel.removeAttribute("aria-modal");
    };
    update();
    mobile.addEventListener("change", update);
    const key = (event: KeyboardEvent) => {
      if (document.querySelector("dialog[open],.workspace-floating-menu"))
        return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key === "Tab" && mobile.matches) {
        const controls = Array.from(
          panel.querySelectorAll<HTMLElement>(
            "button:not([disabled]),a[href],textarea:not([disabled]),input:not([disabled]),select:not([disabled])",
          ),
        ).filter((node) => node.getClientRects().length);
        const first = controls[0],
          last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      mobile.removeEventListener("change", update);
      document.removeEventListener("keydown", key);
      for (const node of siblings) node.inert = false;
      if (previous?.isConnected) previous.focus();
    };
  }, [panelProjectId]);
  if (!project) return null;
  return (
    <aside
      ref={panelRef}
      className={`project-side-panel ${expanded ? "is-expanded" : ""}`}
      aria-label={`${project.name} project panel`}
    >
      <div className="project-panel-toolbar">
        <div role="tablist" aria-label="Project panel">
          <button
            role="tab"
            aria-selected={panelTab === "settings"}
            aria-label="Project settings"
            onClick={() => setPanelTab("settings")}
          >
            <Settings2 size={18} />
          </button>
          <button
            role="tab"
            aria-selected={panelTab === "files"}
            aria-label="Project files"
            onClick={() => setPanelTab("files")}
          >
            <FileText size={18} />
          </button>
        </div>
        <div>
          <button
            type="button"
            aria-label={
              expanded ? "Reduce project panel" : "Expand project panel"
            }
            onClick={() => setExpanded((value) => !value)}
            className="workspace-icon-button"
          >
            {expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
          <button
            type="button"
            onClick={closePanel}
            aria-label="Close project panel"
            className="workspace-icon-button"
          >
            <WorkspaceIcon name="panel" />
          </button>
        </div>
      </div>
      <div className="project-panel-body" key={project.id}>
        {panelTab === "settings" ? (
          <ProjectSettingsContent project={project} />
        ) : (
          <ProjectFilesContent project={project} />
        )}
      </div>
    </aside>
  );
}
function ProjectSettingsContent({ project }: { project: Project }) {
  const { saveProject, editProject } = useProjectWorkspace();
  const [instructions, setInstructions] = useState(project.instructions || ""),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    setInstructions(project.instructions || "");
    setError("");
  }, [project.id, project.instructions]);
  const canManage =
    project.status !== "ARCHIVED" &&
    ["OWNER", "MANAGER"].includes(project.currentUserRole || "");
  async function save() {
    setSaving(true);
    setError("");
    try {
      await saveProject(project, { instructions });
      setSaved(true);
    } catch (error) {
      setError(errorText(error));
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <h2>Project settings</h2>
      <div className="project-settings-identity">
        <button
          type="button"
          className="workspace-icon-button"
          aria-label="Edit project icon"
          disabled={!canManage}
          onClick={() => editProject("icon", project)}
        >
          <ProjectGlyph project={project} />
        </button>
        <span>{project.name}</span>
        <button
          type="button"
          className="workspace-pill"
          disabled={!canManage}
          onClick={() => editProject("rename", project)}
        >
          Rename
        </button>
      </div>
      <section className="project-panel-section">
        <div className="project-panel-row">
          <div>
            <h3>Instructions</h3>
            <p>Customize how Assistant and Hermes work in this project.</p>
          </div>
        </div>
        <textarea
          aria-label="Project instructions"
          maxLength={4000}
          rows={5}
          value={instructions}
          disabled={!canManage || saving}
          onChange={(event) => {
            setInstructions(event.target.value);
            setSaved(false);
          }}
          placeholder="Add your project goals, preferences, and working instructions…"
        />
        <div className="project-settings-save">
          <span role="status" className="workspace-subtle">
            {saved
              ? "Saved"
              : !canManage
                ? "Only project owners and managers can edit instructions."
                : ""}
          </span>
          <button
            type="button"
            disabled={
              !canManage ||
              saving ||
              instructions === (project.instructions || "")
            }
            onClick={() => void save()}
            className="workspace-pill"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
        {error && (
          <p role="alert" className="workspace-form-error">
            {error}
          </p>
        )}
      </section>
    </>
  );
}
function ProjectFilesContent({ project }: { project: Project }) {
  const { pendingFolder, consumeFolder } = useProjectWorkspace(),
    { currentProject, setCurrentProject } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [uploading, setUploading] = useState(false),
    [revision, setRevision] = useState(0);
  const input = useRef<HTMLInputElement>(null),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    api.documents
      .list(project.id)
      .then((rows) => {
        if (active) setDocuments(rows);
      })
      .catch((error) => {
        if (active) setError(errorText(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [project.id, revision]);
  async function upload(files: File[]) {
    if (uploading || !files.length) return;
    setUploading(true);
    setError("");
    try {
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        form.append("title", file.name);
        await api.documents.upload(project.id, form);
      }
      if (alive.current) setRevision((value) => value + 1);
    } catch (error) {
      if (alive.current) {
        setError(errorText(error));
        setRevision((value) => value + 1);
      }
    } finally {
      if (alive.current) setUploading(false);
    }
  }
  const writable =
    project.status !== "ARCHIVED" &&
    ["OWNER", "MANAGER", "CONTRIBUTOR"].includes(project.currentUserRole || "");
  return (
    <>
      <div className="project-panel-row">
        <h2>{project.name} · Files</h2>
        <button
          type="button"
          className="workspace-pill"
          disabled={!writable || uploading}
          onClick={() => input.current?.click()}
        >
          {uploading ? "Uploading…" : "Add"}
        </button>
      </div>
      <p className="workspace-subtle">
        Documents are shared with project members. Processing may take a moment
        after upload.
      </p>
      <input
        ref={input}
        type="file"
        multiple
        aria-label="Add project documents"
        className="hidden"
        onChange={(event) => {
          void upload(Array.from(event.target.files || []));
          event.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={!writable || uploading}
        className="project-file-drop"
        onClick={() => input.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (writable) void upload(Array.from(event.dataTransfer.files));
        }}
      >
        <FilePlus2 size={26} />
        <span>Drag and drop files here</span>
      </button>
      {error && (
        <p role="alert" className="workspace-form-error">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status" className="workspace-subtle">
          Loading files…
        </p>
      ) : (
        documents.map((document) => (
          <div key={document.id} className="project-file-row">
            <FileText size={18} />
            <div>
              <span>{document.title || document.originalFilename}</span>
              <small>{document.processingStatus || "Uploaded"}</small>
            </div>
            <button
              type="button"
              aria-label={`Download ${document.title || document.originalFilename}`}
              onClick={() =>
                void api.documents
                  .downloadFile(
                    project.id,
                    document.id,
                    document.originalFilename || document.title,
                  )
                  .catch((error) => setError(errorText(error)))
              }
              className="workspace-pill"
            >
              Download
            </button>
          </div>
        ))
      )}
      <UploadedFolderSources
        projectId={project.id}
        initialFiles={pendingFolder || undefined}
        onInitialFilesConsumed={consumeFolder}
      />
      <Link
        href="/documents"
        className="workspace-pill"
        onClick={() => {
          if (currentProject?.id !== project.id) setCurrentProject(project);
        }}
      >
        Open full file library
      </Link>
    </>
  );
}
