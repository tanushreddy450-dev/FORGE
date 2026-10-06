import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Flame,
  ArrowRight,
  BookOpen,
  Code2,
  Sparkles,
  History,
  Layers,
  Clock,
} from "lucide-react";
import type { Topic, Problem } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/shadcn/ui/button";
import {
  fetchTopics,
  fetchProgress,
  fetchProblems,
  fetchRecommendations,
  fetchSubmissions,
  fetchInsights,
} from "@/lib/api";

export default function Dashboard() {
  const { user } = useAuth();
  const [topicsData, setTopicsData] = useState<Topic[] | null>(null);
  const [problemsData, setProblemsData] = useState<Problem[] | null>(null);
  const [stats, setStats] = useState({
    totalSolved: 0,
    easySolved: 0,
    mediumSolved: 0,
    hardSolved: 0,
    streak: 0,
    totalSubmissions: 0,
    topicsCompleted: 0,
    rank: "Beginner",
  });
  const [name, setName] = useState("");
  const [recommendations, setRecommendations] = useState<
    { id: number; title: string; slug: string; difficulty: string; topic_name: string | null; reason: string }[]
  >([]);
  const [recentSubmissions, setRecentSubmissions] = useState<
    { id: number; problem_id: number; status: string; created_at: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    if (user) setName(user.full_name || user.username || "Student");
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      fetchTopics().then((data) => {
        const list = (data as Record<string, unknown>[]).map((r) => ({
          id: String(r.id as string | number),
          name: r.name as string,
          slug: r.slug as string,
          description: r.description as string,
          icon: (r.icon as string) || "BookOpen",
          difficulty: r.difficulty as Topic["difficulty"],
          problemCount: (r.problem_count as number) ?? (r.problemCount as number) ?? 0,
          completedProblems: (r.completed_problems as number) ?? (r.completedProblems as number) ?? 0,
          category: r.category as string,
          subtopics: (r.subtopics as string[]) ?? [],
        }));
        if (!cancelled && list.length) setTopicsData(list);
      }),

      fetchProblems({ limit: 100 }).then((body) => {
        const list = (body.data as Record<string, unknown>[]).map((r) => ({
          id: String(r.id as string | number),
          title: r.title as string,
          slug: r.slug as string,
          difficulty: r.difficulty as Problem["difficulty"],
          topicId: String(r.topic_id ?? r.topicId ?? ""),
          topicName: (r.topic_name ?? r.topicName ?? "") as string,
          description: r.description as string,
          examples: (r.examples as never[]) ?? [],
          constraints: (r.constraints as string[]) ?? [],
          starterCode: (r.starter_code as string) ?? (r.starterCode as string) ?? "",
          testCases: (r.test_cases as never[]) ?? [],
          tags: (r.tags as string[]) ?? [],
          acceptance: (r.acceptance as number) ?? 0,
          solved: (r.solved as boolean) ?? false,
        }));
        if (!cancelled && list.length) setProblemsData(list);
      }),

      fetchProgress().then((res) => {
        const p = res as Record<string, unknown> | null;
        if (!cancelled && p) {
          setStats((prev) => ({
            ...prev,
            totalSolved: (p.total_solved as number) ?? prev.totalSolved,
            easySolved: (p.easy_solved as number) ?? prev.easySolved,
            mediumSolved: (p.medium_solved as number) ?? prev.mediumSolved,
            hardSolved: (p.hard_solved as number) ?? prev.hardSolved,
            streak: (p.streak_days as number) ?? (p.streak as number) ?? prev.streak,
            totalSubmissions: (p.total_submissions as number) ?? prev.totalSubmissions,
            topicsCompleted: (p.topics_completed as number) ?? prev.topicsCompleted,
            rank: (p.rank as string) ?? prev.rank,
          }));
        }
      }),

      fetchRecommendations().then((recs) => {
        if (!cancelled && Array.isArray(recs)) {
          setRecommendations(
            recs as { id: number; title: string; slug: string; difficulty: string; topic_name: string | null; reason: string }[]
          );
        }
      }),

      fetchSubmissions().then((body) => {
        if (!cancelled && body && Array.isArray(body.data)) {
          setRecentSubmissions(
            body.data.slice(0, 5) as { id: number; problem_id: number; status: string; created_at: string }[]
          );
        }
      }),
    ]).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Determine current active topic & next action
  const currentTopic =
    (topicsData || []).find((t) => t.completedProblems > 0 && t.completedProblems < t.problemCount) ||
    (topicsData && topicsData[0]) ||
    null;

  const nextProblem = recommendations[0] || null;
  const totalProblemsCount = (topicsData || []).reduce((acc, t) => acc + t.problemCount, 0) || 80;

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Workspace Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          {greeting}, {name || "Student"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here is your learning summary. Focus on one problem at a time.
        </p>
      </div>

      {/* 2. Primary Next Action Card (Answers "What should I work on next?") */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent text-accent-foreground border border-border">
                Continue Learning
              </span>
              {currentTopic && (
                <span className="text-xs text-muted-foreground font-medium">
                  {currentTopic.category}
                </span>
              )}
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {currentTopic ? currentTopic.name : "Arrays & Two Pointers"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {nextProblem ? (
                  <>
                    Recommended next problem: <span className="font-medium text-foreground">{nextProblem.title}</span> ({nextProblem.difficulty}). {nextProblem.reason}
                  </>
                ) : (
                  currentTopic?.description || "Master pointer movement and window contraction step by step."
                )}
              </p>
            </div>

            {/* Progress bar */}
            {currentTopic && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Topic Progress</span>
                  <span>
                    {currentTopic.completedProblems} of {currentTopic.problemCount} solved
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.round(
                        (currentTopic.completedProblems / Math.max(currentTopic.problemCount, 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 self-start lg:self-center">
            {nextProblem ? (
              <Button asChild className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs px-5 h-9 shadow-xs">
                <Link to={`/arena/${nextProblem.slug}`}>
                  Solve Next Problem <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Link>
              </Button>
            ) : currentTopic ? (
              <Button asChild className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs px-5 h-9 shadow-xs">
                <Link to={`/topics/${currentTopic.slug}`}>
                  Continue Topic <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Link>
              </Button>
            ) : null}

            {currentTopic && (
              <Button asChild variant="outline" className="rounded-lg border-border bg-card text-foreground hover:bg-secondary font-medium text-xs px-5 h-9">
                <Link to={`/topics/${currentTopic.slug}`}>
                  Open 3D Visualizer
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 3. High-level Summary Metrics (Clean & Restrained) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Problems Solved */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Problems Solved</span>
            <Code2 className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-semibold text-foreground">
            {stats.totalSolved}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              / {totalProblemsCount}
            </span>
          </div>
          <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">{stats.easySolved} Easy</span>
            <span>•</span>
            <span className="text-amber-600 dark:text-amber-400 font-medium">{stats.mediumSolved} Med</span>
            <span>•</span>
            <span className="text-red-600 dark:text-red-400 font-medium">{stats.hardSolved} Hard</span>
          </div>
        </div>

        {/* Practice Streak */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Learning Streak</span>
            <Flame className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-semibold text-foreground">
            {stats.streak} <span className="text-xs font-normal text-muted-foreground">days</span>
          </div>
          <p className="text-[11px] text-muted-foreground pt-1">
            Solve at least 1 problem daily to keep momentum.
          </p>
        </div>

        {/* Curriculum Progress */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Topics Completed</span>
            <BookOpen className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-semibold text-foreground">
            {stats.topicsCompleted}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              / {(topicsData || []).length || 14}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground pt-1">
            Rank: <span className="font-medium text-foreground">{stats.rank}</span>
          </p>
        </div>
      </div>

      {/* 4. Recommended Problems Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            Recommended Practice
          </h2>
          <Link
            to="/problems"
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
          >
            All problems <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {recommendations.slice(0, 3).map((rec) => (
            <Link
              key={rec.id}
              to={`/arena/${rec.slug}`}
              className="p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors flex flex-col justify-between space-y-2.5 group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {rec.topic_name || "General"}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      rec.difficulty === "Easy"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : rec.difficulty === "Medium"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-red-500/10 text-red-600 dark:text-red-400"
                    }`}
                  >
                    {rec.difficulty}
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                  {rec.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {rec.reason}
                </p>
              </div>

              <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs font-medium text-primary">
                <span>Start problem</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. Core Topics Overview */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            Curriculum Topics
          </h2>
          <Link
            to="/topics"
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
          >
            Explore all topics <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {(topicsData || []).slice(0, 6).map((topic) => {
            const pct = topic.problemCount
              ? Math.round((topic.completedProblems / topic.problemCount) * 100)
              : 0;
            return (
              <Link
                key={topic.id}
                to={`/topics/${topic.slug}`}
                className="p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors flex flex-col justify-between space-y-3 group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase">
                      {topic.category}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {topic.completedProblems}/{topic.problemCount} solved
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                    {topic.name}
                  </h3>
                </div>

                <div className="space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-right text-[10px] text-muted-foreground font-medium">
                    {pct}%
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 6. Recent Activity */}
      {recentSubmissions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            Recent Activity
          </h2>
          <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
            {recentSubmissions.map((sub) => {
              const isAccepted = sub.status === "Accepted";
              return (
                <div key={sub.id} className="p-3.5 sm:px-4 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center ${
                        isAccepted
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {isAccepted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                    </div>
                    <span className="font-medium text-foreground">
                      Problem #{sub.problem_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span className={isAccepted ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}>
                      {sub.status}
                    </span>
                    <span>{new Date(sub.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
