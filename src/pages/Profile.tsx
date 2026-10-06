import { useEffect, useState } from "react";
import {
  Flame,
  Award,
  CheckCircle2,
  BookOpen,
  Code2,
  GraduationCap,
  Calendar,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/shadcn/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { fetchProgress, fetchTopics } from "@/lib/api";
import type { Topic } from "@/types";

export default function Profile() {
  const { user } = useAuth();
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
  const [profile, setProfile] = useState({
    name: user?.full_name || "",
    email: user?.email || "",
    college: user?.college || "",
    joinedDate: "January 2026",
  });
  const [topicsData, setTopicsData] = useState<Topic[]>([]);

  const totalProblems = topicsData.reduce(
    (sum, t) => sum + (t.problemCount || 0),
    0
  ) || 80;

  const acceptanceRate =
    stats.totalSubmissions > 0
      ? ((stats.totalSolved / stats.totalSubmissions) * 100).toFixed(1)
      : "0.0";

  useEffect(() => {
    if (user) {
      setProfile((prev) => ({
        ...prev,
        name: user.full_name || prev.name,
        email: user.email || prev.email,
        college: (user.college as string) || prev.college,
      }));
    }
  }, [user]);

  useEffect(() => {
    fetchProgress()
      .then((data) => {
        const d = data as Record<string, unknown>;
        if (d && typeof d.total_solved === "number") {
          setStats({
            totalSolved: d.total_solved as number,
            easySolved: d.easy_solved as number,
            mediumSolved: d.medium_solved as number,
            hardSolved: d.hard_solved as number,
            streak: d.streak as number,
            totalSubmissions: d.total_submissions as number,
            topicsCompleted: d.topics_completed as number,
            rank: (d.rank as string) || "Beginner",
          });
        }
      })
      .catch(() => {});

    fetchTopics()
      .then((data) => {
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
        if (list.length) setTopicsData(list);
      })
      .catch(() => {});
  }, []);

  const sortedTopics = [...topicsData].sort(
    (a, b) => b.completedProblems - a.completedProblems
  );

  const initial = (profile.name || user?.username || "S").charAt(0).toUpperCase();

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Profile Identity Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <Avatar className="h-16 w-16 rounded-xl border border-border">
            <AvatarFallback className="rounded-xl bg-secondary text-foreground font-semibold text-2xl">
              {initial}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center sm:text-left space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
                  {profile.name || user?.username || "Student"}
                </h1>
                <p className="text-xs text-muted-foreground">
                  @{user?.username || "student"} • {profile.email}
                </p>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 sm:pt-0">
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-secondary text-foreground border border-border">
                  <Award className="w-3.5 h-3.5 text-primary" /> {stats.rank}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-accent text-accent-foreground border border-border">
                  <Flame className="w-3.5 h-3.5 text-primary" /> {stats.streak} day streak
                </span>
              </div>
            </div>

            {profile.college && (
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-muted-foreground pt-1">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>{profile.college}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl border border-border bg-card space-y-1">
          <p className="text-xs text-muted-foreground">Problems Solved</p>
          <p className="text-2xl font-semibold text-foreground">
            {stats.totalSolved}
            <span className="text-xs font-normal text-muted-foreground"> / {totalProblems}</span>
          </p>
          <div className="flex items-center gap-2 pt-0.5 text-[10px] text-muted-foreground">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">{stats.easySolved}E</span>
            <span>•</span>
            <span className="text-amber-600 dark:text-amber-400 font-medium">{stats.mediumSolved}M</span>
            <span>•</span>
            <span className="text-red-600 dark:text-red-400 font-medium">{stats.hardSolved}H</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card space-y-1">
          <p className="text-xs text-muted-foreground">Acceptance Rate</p>
          <p className="text-2xl font-semibold text-foreground">{acceptanceRate}%</p>
          <p className="text-[10px] text-muted-foreground pt-0.5">
            {stats.totalSubmissions} total submissions
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card space-y-1">
          <p className="text-xs text-muted-foreground">Current Streak</p>
          <p className="text-2xl font-semibold text-foreground">{stats.streak} days</p>
          <p className="text-[10px] text-muted-foreground pt-0.5">Keep learning daily</p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card space-y-1">
          <p className="text-xs text-muted-foreground">Topics Completed</p>
          <p className="text-2xl font-semibold text-foreground">
            {stats.topicsCompleted}
            <span className="text-xs font-normal text-muted-foreground"> / {topicsData.length || 14}</span>
          </p>
          <p className="text-[10px] text-muted-foreground pt-0.5">Curriculum progression</p>
        </div>
      </div>

      {/* 3. Topic Mastery List */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">
          Topic Breakdown
        </h2>
        <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
          {sortedTopics.map((topic) => {
            const pct = topic.problemCount
              ? Math.round((topic.completedProblems / topic.problemCount) * 100)
              : 0;

            return (
              <div key={topic.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="font-semibold text-sm text-foreground">{topic.name}</span>
                  <p className="text-muted-foreground text-xs">{topic.category}</p>
                </div>

                <div className="flex items-center gap-4 sm:w-60">
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>{topic.completedProblems}/{topic.problemCount} solved</span>
                      <span className="font-medium text-foreground">{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
