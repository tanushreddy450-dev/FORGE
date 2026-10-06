import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, CheckCircle2, ChevronUp, ChevronDown, ArrowRight, Code2 } from "lucide-react";
import type { Problem } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/ui/table";
import { fetchProblems } from "@/lib/api";

type Difficulty = "All" | "Easy" | "Medium" | "Hard";
type Status = "All" | "Solved" | "Unsolved";
type SortField = "title" | "difficulty" | null;
type SortDir = "asc" | "desc";

const difficultyOrder: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2 };

function normalizeProblem(raw: Record<string, unknown>): Problem {
  const topicId = String(raw.topic_id ?? raw.topicId ?? "");
  const topicName = (raw.topic_name ?? raw.topicName ?? "") as string;
  return {
    id: String(raw.id as string | number),
    title: raw.title as string,
    slug: raw.slug as string,
    difficulty: raw.difficulty as Problem["difficulty"],
    topicId,
    topicName,
    description: raw.description as string,
    examples: (raw.examples as Problem["examples"]) ?? [],
    constraints: (raw.constraints as string[]) ?? [],
    starterCode: (raw.starter_code as string) ?? (raw.starterCode as string) ?? "",
    testCases: (raw.test_cases as Problem["testCases"]) ?? (raw.testCases as Problem["testCases"]) ?? [],
    tags: (raw.tags as string[]) ?? [],
    acceptance: (raw.acceptance as number) ?? 0,
    solved: (raw.solved as boolean) ?? false,
  };
}

export default function Problems() {
  const [searchParams] = useSearchParams();
  const initialTopic = searchParams.get("topic") || "All";
  const [difficulty, setDifficulty] = useState<Difficulty>("All");
  const [selectedTopic, setSelectedTopic] = useState<string>(initialTopic);
  const [status, setStatus] = useState<Status>("All");
  const [search, setSearch] = useState<string>(() => searchParams.get("search") ?? "");
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const perPage = 15;

  const [problemsData, setProblemsData] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProblems({
      difficulty: difficulty !== "All" ? difficulty : undefined,
      topic_id: selectedTopic !== "All" ? selectedTopic : undefined,
      search: search || undefined,
    })
      .then((body) => {
        if (cancelled) return;
        const list = (body.data as Record<string, unknown>[]).map(normalizeProblem);
        if (list.length > 0) setProblemsData(list);
        else if (body.data && body.data.length === 0) {
          setProblemsData([]);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [difficulty, selectedTopic, search]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    let list = [...problemsData];
    if (status === "Solved") list = list.filter((p) => p.solved);
    if (status === "Unsolved") list = list.filter((p) => !p.solved);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(q) || p.topicName.toLowerCase().includes(q));
    }
    if (sortField) {
      list.sort((a, b) => {
        if (sortField === "title") {
          const cmp = a.title.localeCompare(b.title);
          return sortDir === "asc" ? cmp : -cmp;
        }
        const cmp = difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return list;
  }, [problemsData, status, search, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const start = (page - 1) * perPage;
  const paged = filtered.slice(start, start + perPage);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 opacity-25" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 text-primary" />
    ) : (
      <ChevronDown className="w-3 h-3 text-primary" />
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Problems
        </h1>
        <p className="text-sm text-muted-foreground">
          Practice problems categorized by data structures and algorithmic patterns.
        </p>
      </div>

      {/* 2. Controls & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2">
          {/* Difficulty pills */}
          <div className="flex items-center gap-1 bg-secondary p-0.5 rounded-lg">
            {(["All", "Easy", "Medium", "Hard"] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => { setDifficulty(d); setPage(1); }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  difficulty === d
                    ? "bg-card text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Status pills */}
          <div className="flex items-center gap-1 bg-secondary p-0.5 rounded-lg">
            {(["All", "Solved", "Unsolved"] as Status[]).map((s) => (
              <button
                key={s}
                onClick={() => { setStatus(s); setPage(1); }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  status === s
                    ? "bg-card text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search problems..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* 3. Problems Table View */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/40 border-b border-border">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 text-xs font-medium text-muted-foreground">#</TableHead>
              <TableHead className="text-xs">
                <button
                  className="flex items-center gap-1 font-semibold text-foreground hover:text-primary transition-colors"
                  onClick={() => handleSort("title")}
                >
                  Title <SortIcon field="title" />
                </button>
              </TableHead>
              <TableHead className="text-xs">
                <button
                  className="flex items-center gap-1 font-semibold text-foreground hover:text-primary transition-colors"
                  onClick={() => handleSort("difficulty")}
                >
                  Difficulty <SortIcon field="difficulty" />
                </button>
              </TableHead>
              <TableHead className="text-xs font-semibold text-foreground">Topic</TableHead>
              <TableHead className="text-xs font-semibold text-foreground">Acceptance</TableHead>
              <TableHead className="text-xs font-semibold text-foreground">Status</TableHead>
              <TableHead className="text-xs text-right pr-4 font-semibold text-foreground">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border text-xs">
            {loading && problemsData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  Loading problems…
                </TableCell>
              </TableRow>
            ) : paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No problems match your current filters.
                </TableCell>
              </TableRow>
            ) : (
              paged.map((problem, i) => (
                <TableRow
                  key={problem.id}
                  className="hover:bg-secondary/30 transition-colors group"
                >
                  <TableCell className="text-muted-foreground">{start + i + 1}</TableCell>
                  <TableCell>
                    <Link
                      to={`/arena/${problem.slug}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {problem.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        problem.difficulty === "Easy"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : problem.difficulty === "Medium"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-red-500/10 text-red-600 dark:text-red-400"
                      }`}
                    >
                      {problem.difficulty}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{problem.topicName || "General"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {problem.acceptance ? `${Math.round(problem.acceptance * 100)}%` : "68%"}
                  </TableCell>
                  <TableCell>
                    {problem.solved ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Solved
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <Link
                      to={`/arena/${problem.slug}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/85 transition-colors"
                    >
                      Solve <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card text-xs text-muted-foreground">
            <span>
              Showing {start + 1}–{Math.min(start + perPage, filtered.length)} of {filtered.length} problems
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-border bg-card text-foreground disabled:opacity-40 hover:bg-secondary transition-colors"
              >
                Previous
              </button>
              <span className="px-2 font-medium text-foreground">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded border border-border bg-card text-foreground disabled:opacity-40 hover:bg-secondary transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
