import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";
import "./workspace-theme.css";
import { WorkspaceThemeProvider } from "@/context/workspace-theme";
import { ProjectWorkspaceProvider } from "@/components/project-workspace";
import { AuthProvider } from "@/context/auth-context";
import { ToastProvider } from "@/context/toast-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OSCAR",
  description: "Your projects, knowledge, and AI in one workspace.",
  icons: {
    icon: [
      { url: "/favicon.ico?v=continuum-infinity-1", sizes: "any" },
      { url: "/icon.svg?v=continuum-infinity-1", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico?v=continuum-infinity-1",
    apple: [
      {
        url: "/apple-icon.png?v=continuum-infinity-1",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-workspace-theme="dark"
      suppressHydrationWarning
      style={{ colorScheme: "dark" }}
    >
      <head>
        <Script
          id="workspace-theme-init"
          strategy="beforeInteractive"
        >{`try{var t=localStorage.getItem('aiw_theme');var r=t==='light'?'light':t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):'dark';document.documentElement.dataset.workspaceTheme=r;document.documentElement.style.colorScheme=r;}catch{}`}</Script>
      </head>
      <body
        className={`${inter.className} bg-[#08090a] text-zinc-100 min-h-screen`}
      >
        <WorkspaceThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <ProjectWorkspaceProvider>{children}</ProjectWorkspaceProvider>
            </ToastProvider>
          </AuthProvider>
        </WorkspaceThemeProvider>
      </body>
    </html>
  );
}
