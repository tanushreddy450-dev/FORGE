import { useEffect, useState } from "react";
import { Trophy, Medal, Flame } from "lucide-react";
import { fetchLeaderboard } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/ui/table";

type Entry = {
  rank: number;
  user_id: string;
  username: string;
  full_name: string;
  total_solved: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  streak: number;
  rank_title: string;
};

export default function Leaderboard() {
  const [data, setData] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard(20)
      .then((res) => {
        if (cancelled) return;
        setData(res as Entry[]);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load leaderboard");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Leaderboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Student rankings based on problems solved and continuous practice streaks.
        </p>
      </div>

      {loading && (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-xs text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="p-12 text-center rounded-xl border border-border bg-card space-y-2">
          <Trophy className="w-8 h-8 mx-auto text-muted-foreground" />
          <h3 className="font-semibold text-foreground text-sm">No rankings yet</h3>
          <p className="text-xs text-muted-foreground">Submit a solved problem to be the first on the board.</p>
        </div>
      )}

      {!loading && !error && data.length > 0 && (
        <div className="space-y-6">
          {/* Top 3 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {top3.map((entry, idx) => (
              <div
                key={entry.user_id}
                className={`p-5 rounded-xl border bg-card space-y-3 ${
                  idx === 0
                    ? "border-primary/50 shadow-xs"
                    : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    idx === 0
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : idx === 1
                      ? "bg-slate-500/10 text-slate-600 dark:text-slate-400"
                      : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                  }`}>
                    #{idx + 1} Place
                  </span>
                  <Medal className="w-4 h-4 text-muted-foreground" />
                </div>

                <div>
                  <h3 className="font-semibold text-base text-foreground truncate">
                    {entry.full_name || entry.username}
                  </h3>
                  <p className="text-xs text-muted-foreground">@{entry.username}</p>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Solved</span>
                  <span className="font-semibold text-foreground">{entry.total_solved}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Full Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader className="bg-secondary/40 border-b border-border">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-14 text-xs font-semibold text-foreground">Rank</TableHead>
                  <TableHead className="text-xs font-semibold text-foreground">Student</TableHead>
                  <TableHead className="text-xs font-semibold text-foreground">Problems Solved</TableHead>
                  <TableHead className="text-xs font-semibold text-foreground">Breakdown</TableHead>
                  <TableHead className="text-xs text-right pr-4 font-semibold text-foreground">Streak</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border text-xs">
                {data.map((entry) => (
                  <TableRow key={entry.user_id} className="hover:bg-secondary/30 transition-colors">
                    <TableCell className="font-medium text-foreground">#{entry.rank}</TableCell>
                    <TableCell>
                      <span className="font-medium text-foreground">{entry.full_name || entry.username}</span>
                      <span className="text-muted-foreground ml-1.5 text-[11px]">@{entry.username}</span>
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">{entry.total_solved}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="text-emerald-600 dark:text-emerald-400">{entry.easy_solved}E</span> •{" "}
                      <span className="text-amber-600 dark:text-amber-400">{entry.medium_solved}M</span> •{" "}
                      <span className="text-red-600 dark:text-red-400">{entry.hard_solved}H</span>
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      {entry.streak > 0 ? (
                        <span className="inline-flex items-center gap-1 text-primary font-medium">
                          <Flame className="w-3.5 h-3.5" /> {entry.streak}d
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
