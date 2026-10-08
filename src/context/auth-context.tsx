"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api, setCsrfToken } from "@/lib/api";

export interface User {
  id: string;
  email: string;
  displayName: string;
  systemRole: string;
  professionalRole: string;
  isActive: boolean;
  mustChangePassword?: boolean;
  fullName?: string;
  role?: string;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description?: string | null;
  status: string;
  version: number;
  currentUserRole?: "OWNER" | "MANAGER" | "CONTRIBUTOR" | "VIEWER";
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthContextType {
  user: User | null;
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  setCurrentProject: (proj: Project | null) => void;
  refreshProjects: () => Promise<void>;
  updateUser: (updated: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  projects: [],
  currentProject: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  setCurrentProject: () => {},
  refreshProjects: async () => {},
  updateUser: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setCurrentProject = (p: Project | null) => {
    setCurrentProjectState(p);
    if (typeof window !== "undefined") {
      if (p) {
        localStorage.setItem("aiw_current_project", JSON.stringify(p));
      } else {
        localStorage.setItem("aiw_current_project", "ALL");
      }
    }
  };

  const refreshProjects = async () => {
    try {
      const list = await api.projects.list();
      setProjects(list || []);
      if (list && list.length > 0) {
        let activeProj: Project | null = null;
        let isExplicitAll = false;
        if (typeof window !== "undefined") {
          const saved = localStorage.getItem("aiw_current_project");
          if (saved === "ALL") {
            isExplicitAll = true;
          } else if (saved) {
            try {
              const parsed = JSON.parse(saved);
              activeProj = list.find((p: Project) => p.id === parsed.id) || null;
            } catch {
              activeProj = null;
            }
          }
        }
        if (isExplicitAll) {
          setCurrentProjectState(null);
        } else if (activeProj) {
          setCurrentProjectState(activeProj);
          if (typeof window !== "undefined") {
            localStorage.setItem("aiw_current_project", JSON.stringify(activeProj));
          }
        } else {
          // Default to "All Projects"
          setCurrentProjectState(null);
          if (typeof window !== "undefined") {
            localStorage.setItem("aiw_current_project", "ALL");
          }
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    async function init() {
      try {
        // Always refresh CSRF token first so POST requests work after page reload
        await api.auth.csrf();
        const me = await api.auth.me();
        setUser(me);
        await refreshProjects();
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const data = await api.auth.login(email, pass);
      setUser(data.user);
      await refreshProjects();
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, pass: string, displayName?: string) => {
    setIsLoading(true);
    try {
      const data = await api.auth.register(email, pass, displayName);
      setUser(data.user);
      await refreshProjects();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore
    }
    setUser(null);
    setProjects([]);
    setCurrentProjectState(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("aiw_current_project");
    }
    setCsrfToken(null);
  };

  const refreshUser = async () => {
    try {
      const me = await api.auth.me();
      if (me) setUser(me);
    } catch {
      // ignore
    }
  };

  const updateUser = (updated: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        projects,
        currentProject,
        isLoading,
        login,
        register,
        logout,
        setCurrentProject,
        refreshProjects,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
