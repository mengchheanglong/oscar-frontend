"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { AppLayout } from "@/components/app-layout";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search as SearchIcon,
  FileText,
  FileCheck2,
  GitPullRequest,
  CheckSquare,
  Calendar,
  ExternalLink,
  X,
  Sparkles,
  Database,
  Cpu,
  Code2,
} from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

function GithubIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

const TYPE_ICONS: Record<string, any> = {
  REQUIREMENT: FileCheck2,
  DECISION: GitPullRequest,
  TASK: CheckSquare,
  MEETING: Calendar,
  DOCUMENT: FileText,
  GITHUB_ISSUE: GithubIcon,
  GITHUB_PR: GitPullRequest,
  GITHUB_CODE: Code2,
};

const TYPE_LINKS: Record<string, string> = {
  REQUIREMENT: "/requirements",
  DECISION: "/decisions",
  TASK: "/tasks",
  MEETING: "/meetings",
  DOCUMENT: "/documents",
  GITHUB_ISSUE: "/integrations",
  GITHUB_PR: "/integrations",
  GITHUB_CODE: "/integrations",
};

const TYPE_COLORS: Record<string, string> = {
  REQUIREMENT: "bg-blue-50 text-blue-700 border border-blue-200",
  DECISION: "bg-purple-50 text-purple-700 border border-purple-200",
  TASK: "bg-[#E8F5E9] text-[#2D8A60] border border-green-200",
  MEETING: "bg-cyan-50 text-cyan-700 border border-cyan-200",
  DOCUMENT: "bg-amber-50 text-amber-700 border border-amber-200",
  GITHUB_ISSUE: "bg-slate-900 text-white border border-slate-700",
  GITHUB_PR: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  GITHUB_CODE: "bg-indigo-50 text-indigo-800 border border-indigo-200",
};

const SUGGESTIONS = [
  "Authentication",
  "Verification",
  "Session",
  "PostgreSQL",
  "AIW-REQ-1",
  "Cookie",
  "Meeting",
];

export default function SearchPage() {
  const { currentProject, projects, setCurrentProject } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<string>("");
  const [searchMode, setSearchMode] = useState<"hybrid" | "semantic" | "keyword">("hybrid");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const executeSearch = useCallback(
    async (
      searchTerm: string,
      typeFilter?: string,
      mode: "hybrid" | "semantic" | "keyword" = searchMode
    ) => {
      if (!currentProject || !searchTerm.trim()) return;
      setLoading(true);
      setHasSearched(true);
      try {
        const envelope = await api.search.query(
          currentProject.id,
          searchTerm.trim(),
          typeFilter || undefined,
          1,
          25,
          mode
        );
        setResults(envelope.data || []);
        setMeta(envelope.meta || null);
      } catch (err: any) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    },
    [currentProject, searchMode]
  );

  // Read URL query parameter (?q= or ?search=) on load and execute search
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const incomingQuery = params.get("q") || params.get("search");
      if (incomingQuery && incomingQuery.trim()) {
        const trimmed = incomingQuery.trim();
        setQuery(trimmed);
        const typeParam = params.get("type");
        const modeParam = params.get("mode") as any;
        const validMode =
          modeParam === "semantic" || modeParam === "keyword" ? modeParam : "hybrid";
        if (modeParam) setSearchMode(validMode);
        if (typeParam) setSelectedType(typeParam);
        if (currentProject) {
          executeSearch(trimmed, typeParam || undefined, validMode);
        }
      }
    }
  }, [currentProject, executeSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query, selectedType, searchMode);
  };

  const handleSuggestionClick = (term: string) => {
    setQuery(term);
    executeSearch(term, selectedType, searchMode);
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    if (query.trim()) {
      executeSearch(query, type, searchMode);
    }
  };

  const handleModeChange = (mode: "hybrid" | "semantic" | "keyword") => {
    setSearchMode(mode);
    if (query.trim()) {
      executeSearch(query, selectedType, mode);
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setMeta(null);
    setHasSearched(false);
  };

  const counts = meta?.countsByType || {};
  const totalCount =
    (counts.REQUIREMENT || 0) +
    (counts.DECISION || 0) +
    (counts.TASK || 0) +
    (counts.MEETING || 0) +
    (counts.DOCUMENT || 0) +
    (counts.GITHUB_ISSUE || 0) +
    (counts.GITHUB_PR || 0) +
    (counts.GITHUB_CODE || 0);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Header */}
        <div className="border-b border-codex-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-codex-accent flex items-center justify-center border border-blue-100">
              <SearchIcon className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-codex-text font-serif">
              Universal Search
            </h1>
          </div>
          <p className="text-xs text-codex-muted mt-1">
            Instant multi-entity search across requirements, decisions, tasks, meetings, and documents with faceted counts.
          </p>
        </div>

        {/* Project Required Banner if All Projects is currently active */}
        {!currentProject && projects.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <span className="font-medium">
              Universal search requires a target project. Select a workspace:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setCurrentProject(p)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs cursor-pointer"
                >
                  [{p.key}] {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Mode Selector & Input Bar */}
        <div className="space-y-2.5">
          {/* Search Mode Selector */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Search Engine:</span>
              <div className="inline-flex items-center p-1 bg-white border border-slate-200 rounded-xl shadow-xs gap-1">
                <button
                  type="button"
                  onClick={() => handleModeChange("hybrid")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                    searchMode === "hybrid"
                      ? "bg-[#161927] text-white shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Reciprocal Rank Fusion: combines semantic vectors and keyword FTS for maximum recall"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Hybrid (RRF Fusion)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("semantic")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                    searchMode === "semantic"
                      ? "bg-[#161927] text-white shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Cosine similarity over OpenAI 1536-dimensional pgvector embeddings"
                >
                  <Cpu className="w-3.5 h-3.5 text-blue-400" />
                  <span>Semantic (pgvector)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("keyword")}
                  className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                    searchMode === "keyword"
                      ? "bg-[#161927] text-white shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Exact PostgreSQL full-text search"
                >
                  <SearchIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Keyword (FTS)</span>
                </button>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 font-mono hidden sm:block">
              {searchMode === "hybrid" && "RRF Rank Fusion • Cosine + ts_rank"}
              {searchMode === "semantic" && "pgvector text-embedding-3-small"}
              {searchMode === "keyword" && "PostgreSQL Full-Text Search"}
            </div>
          </div>

          {/* Search Input Bar */}
          <form onSubmit={handleSearch} className="flex gap-2.5">
            <div className="relative flex-1">
              <SearchIcon className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search keyword or local key (e.g. AIW-REQ-1, postgres, session, auth)..."
                className="w-full pl-10 pr-10 text-xs h-10 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-codex-accent focus:border-codex-accent shadow-xs"
              />
              {query && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button
              type="submit"
              disabled={loading || !query.trim()}
              className="h-10 px-5 text-xs bg-codex-accent hover:bg-codex-hover text-white font-medium rounded-xl shadow-xs"
            >
              {loading ? "Searching..." : "Search"}
            </Button>
          </form>
        </div>

        {/* Suggested Searches */}
        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
            <Sparkles className="w-3 h-3 text-codex-accent" /> Suggestions:
          </span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSuggestionClick(s)}
              className="px-2.5 py-0.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-[11px] text-slate-600 hover:text-slate-900 transition-all font-mono shadow-2xs cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Faceted Tabs */}
        {hasSearched && (
          <div className="inline-flex items-center p-1 bg-white border border-slate-200 rounded-xl shadow-xs gap-1 flex-wrap">
            <button
              onClick={() => handleTypeChange("")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedType === ""
                  ? "bg-[#161927] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Results ({totalCount || results.length})
            </button>
            <button
              onClick={() => handleTypeChange("REQUIREMENT")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedType === "REQUIREMENT"
                  ? "bg-[#161927] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Requirements ({counts.REQUIREMENT || 0})
            </button>
            <button
              onClick={() => handleTypeChange("TASK")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedType === "TASK"
                  ? "bg-[#161927] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tasks ({counts.TASK || 0})
            </button>
            <button
              onClick={() => handleTypeChange("DECISION")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedType === "DECISION"
                  ? "bg-[#161927] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Decisions ({counts.DECISION || 0})
            </button>
            <button
              onClick={() => handleTypeChange("MEETING")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedType === "MEETING"
                  ? "bg-[#161927] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Meetings ({counts.MEETING || 0})
            </button>
            <button
              onClick={() => handleTypeChange("DOCUMENT")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedType === "DOCUMENT"
                  ? "bg-[#161927] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Documents ({counts.DOCUMENT || 0})
            </button>
            <button
              onClick={() => handleTypeChange("GITHUB_ISSUE")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedType === "GITHUB_ISSUE"
                  ? "bg-[#161927] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              GitHub Issues ({counts.GITHUB_ISSUE || 0})
            </button>
            <button
              onClick={() => handleTypeChange("GITHUB_PR")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedType === "GITHUB_PR"
                  ? "bg-[#161927] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              GitHub PRs ({counts.GITHUB_PR || 0})
            </button>
            <button
              onClick={() => handleTypeChange("GITHUB_CODE")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedType === "GITHUB_CODE"
                  ? "bg-[#161927] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Source Code ({counts.GITHUB_CODE || 0})
            </button>
          </div>
        )}

        {/* Results Stream */}
        {loading ? (
          <div className="space-y-3">
            <div className="h-20 rounded-2xl bg-white border border-slate-200 animate-pulse" />
            <div className="h-20 rounded-2xl bg-white border border-slate-200 animate-pulse" />
          </div>
        ) : !hasSearched ? (
          <div className="text-center py-20 p-8 rounded-2xl border border-dashed border-slate-200 bg-white space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-codex-accent flex items-center justify-center mx-auto border border-blue-100">
              <SearchIcon className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 font-serif">
              Instant Workspace Search
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Search by title, project key, or text content across all 5 workspace modules in{" "}
              <span className="text-codex-accent font-semibold">{currentProject?.name}</span>.
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16 p-8 rounded-2xl border border-dashed border-slate-200 bg-white space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 font-serif">No Matching Records Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No results found for &quot;<span className="text-slate-900 font-medium">{query}</span>&quot;. Try different keywords or select another filter tab.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-[11px] font-mono text-slate-400">
              Found {results.length} result(s) for &quot;<span className="text-slate-700 font-semibold">{query}</span>&quot;
            </div>
            {results.map((item, idx) => {
              const Icon = TYPE_ICONS[item.type] || FileText;
              const baseLink = TYPE_LINKS[item.type] || "/dashboard";
              const searchParam = item.key || item.title;
              const externalUrl = item.type === "GITHUB_ISSUE" && item.metadata?.htmlUrl ? (item.metadata.htmlUrl as string) : null;
              const targetUrl = externalUrl || `${baseLink}?id=${item.id}${searchParam ? `&search=${encodeURIComponent(searchParam)}` : ""}`;
              const colorClass = TYPE_COLORS[item.type] || "bg-slate-100 text-slate-700";

              return (
                <Card
                  key={item.id || idx}
                  className="bg-white border border-slate-200 hover:border-slate-300 transition-all shadow-xs hover:shadow-md group rounded-2xl"
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${colorClass}`}>
                          <Icon className="w-3 h-3 mr-1" />
                          <span>{item.type}</span>
                        </span>
                        {item.key && (
                          <span className="font-mono text-xs font-semibold text-codex-accent bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                            {item.key}
                          </span>
                        )}
                        {item.metadata?.score !== undefined && (
                          <span
                            className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold"
                            title="Relevance similarity score"
                          >
                            {typeof item.metadata.score === "number"
                              ? `${(item.metadata.score > 1 ? item.metadata.score : item.metadata.score * 100).toFixed(1)}% match`
                              : `Score: ${item.metadata.score}`}
                          </span>
                        )}
                        <Link
                          href={targetUrl}
                          className="text-xs font-bold text-slate-900 group-hover:text-codex-accent transition-colors hover:underline font-serif"
                        >
                          {item.title}
                        </Link>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/assistant?prompt=${encodeURIComponent(
                            `Tell me about ${item.type.toLowerCase()} [${item.key || ""}]: "${item.title}". Context: "${
                              item.snippet || ""
                            }".`
                          )}`}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 px-2 shadow-2xs"
                            title="Ask AI Copilot about this record"
                          >
                            <Sparkles className="w-3 h-3 text-codex-accent" />
                            <span className="hidden sm:inline">Ask AI</span>
                          </Button>
                        </Link>

                        <Link
                          href={targetUrl}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 px-2 shadow-2xs"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {item.snippet && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {item.snippet}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                      <span>{formatDate(item.createdAt)}</span>
                      <span className="text-slate-400">ID: {item.id.substring(0, 8)}...</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
