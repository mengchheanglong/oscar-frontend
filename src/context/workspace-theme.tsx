"use client";
import { createContext, useContext, useEffect, useState, useId } from "react";
export type WorkspaceTheme = "dark" | "light" | "system";
const ThemeContext = createContext<{
  theme: WorkspaceTheme;
  setTheme: (value: WorkspaceTheme) => void;
}>({ theme: "dark", setTheme: () => {} });
export function WorkspaceThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<WorkspaceTheme>("dark");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("aiw_theme");
      if (saved === "light" || saved === "system") setTheme(saved);
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.workspaceTheme = resolved;
      document.documentElement.style.colorScheme = resolved;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme, ready]);
  const change = (value: WorkspaceTheme) => {
    setTheme(value);
    try {
      localStorage.setItem("aiw_theme", value);
    } catch {}
  };
  return (
    <ThemeContext.Provider value={{ theme, setTheme: change }}>
      {children}
    </ThemeContext.Provider>
  );
}
export const useWorkspaceTheme = () => useContext(ThemeContext);
export function WorkspaceAppearance() {
  const { theme, setTheme } = useWorkspaceTheme();
  const appearanceId = useId();
  return (
    <div className="workspace-appearance">
      <label htmlFor={appearanceId}>Appearance</label>
      <select
        id={appearanceId}
        aria-label="Appearance"
        value={theme}
        onChange={(e) => setTheme(e.target.value as WorkspaceTheme)}
      >
        <option value="dark">Dark</option>
        <option value="light">Light</option>
        <option value="system">System</option>
      </select>
    </div>
  );
}
