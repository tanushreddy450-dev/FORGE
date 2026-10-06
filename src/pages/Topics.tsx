import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Search,
  Layers,
  Code2,
  CheckCircle2,
} from "lucide-react";
import type { Topic } from "@/types";
import { fetchTopics } from "@/lib/api";

const categories = ["All", "Data Structures", "Algorithms"] as const;

function normalizeTopic(raw: Record<string, unknown>): Topic {
  return {
    id: String(raw.id as string | number),
    name: raw.name as string,
    slug: raw.slug as string,
    description: raw.description as string,
    icon: (raw.icon as string) || "BookOpen",
    difficulty: raw.difficulty as Topic["difficulty"],
    problemCount: (raw.problem_count as number) ?? (raw.problemCount as number) ?? 0,
    completedProblems: (raw.completed_problems as number) ?? (raw.completedProblems as number) ?? 0,
    category: raw.category as string,
    subtopics: (raw.subtopics as string[]) ?? [],
  };
}

export default function Topics() {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [topicsData, setTopicsData] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTopics({ category: activeCategory !== "All" ? activeCategory : undefined, search: search || undefined })
      .then((data) => {
        if (cancelled) return;
        const list = (data as Record<string, unknown>[]).map(normalizeTopic);
        if (list.length > 0) setTopicsData(list);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCategory, search]);

  const filtered = topicsData.filter((t) => {
    const matchSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeCategory === "All" || t.category === activeCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Curriculum & Visualizers
        </h1>
        <p className="text-sm text-muted-foreground">
          Select a topic to study algorithmic patterns, inspect real execution, and solve curated problems.
        </p>
      </div>

      {/* 2. Controls (Category pills + search) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 p-1 rounded-lg border border-border bg-card">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search topics (e.g. Arrays, Graphs)..."
            className="w-full h-9 rounded-lg border border-border bg-card pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* 3. Topics Grid */}
      {loading && topicsData.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-44 rounded-xl border border-border bg-card p-5 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-border bg-card space-y-2">
          <p className="text-sm font-medium text-foreground">No topics found</p>
          <p className="text-xs text-muted-foreground">Try adjusting your search query or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((topic) => {
            const pct = topic.problemCount
              ? Math.round((topic.completedProblems / topic.problemCount) * 100)
              : 0;

            return (
              <Link
                key={topic.id}
                to={`/topics/${topic.slug}`}
                className="p-5 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      {topic.category}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        topic.difficulty === "Beginner"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : topic.difficulty === "Intermediate"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-red-500/10 text-red-600 dark:text-red-400"
                      }`}
                    >
                      {topic.difficulty}
                    </span>
                  </div>

                  <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors">
                    {topic.name}
                  </h3>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {topic.description}
                  </p>
                </div>

                <div className="space-y-3 pt-2 border-t border-border/60">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>{topic.completedProblems} of {topic.problemCount} solved</span>
                      <span className="font-medium text-foreground">{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-medium text-primary pt-0.5">
                    <span>Study & Visualize</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
