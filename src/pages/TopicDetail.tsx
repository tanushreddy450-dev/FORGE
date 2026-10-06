import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ChevronRight,
  CheckCircle2,
  Circle,
  BookOpen,
  Clock,
  Layers,
  Eye,
  Code2,
  Lightbulb,
  Cpu,
  Sparkles,
  ArrowRight,
  Target,
  Play,
} from "lucide-react";
import { topicContents } from "@/data/topicContent";
import type { Topic, Problem } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import TopicGlyph from "@/components/ui/TopicGlyph";
import ArrayVisualizer from "@/components/visualizers/ArrayVisualizer";
import SortingVisualizer from "@/components/visualizers/SortingVisualizer";
import { fetchTopic, fetchTopics, fetchProblems } from "@/lib/api";

const difficultyVariant: Record<Topic["difficulty"], "success" | "warning" | "danger"> = {
  Beginner: "success",
  Intermediate: "warning",
  Advanced: "danger",
};

const problemDifficultyVariant: Record<Problem["difficulty"], "success" | "warning" | "danger"> = {
  Easy: "success",
  Medium: "warning",
  Hard: "danger",
};

const difficultyOrder: Record<Problem["difficulty"], number> = {
  Easy: 0,
  Medium: 1,
  Hard: 2,
};

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
function normalizeProblem(raw: Record<string, unknown>): Problem {
  return {
    id: String(raw.id as string | number),
    title: raw.title as string,
    slug: raw.slug as string,
    difficulty: raw.difficulty as Problem["difficulty"],
    topicId: String(raw.topic_id ?? raw.topicId ?? ""),
    topicName: (raw.topic_name ?? raw.topicName ?? "") as string,
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

export default function TopicDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const visualRef = useRef<HTMLDivElement>(null);

  const [topic, setTopic] = useState<Topic | null>(null);
  const [topicProblems, setTopicProblems] = useState<Problem[]>([]);
  const [relatedTopics, setRelatedTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    fetchTopic(slug)
      .then((data) => {
        if (cancelled) return;
        const t = normalizeTopic(data as Record<string, unknown>);
        setTopic(t);
        return t;
      })
      .then(async (t) => {
        if (!t || cancelled) return;
        try {
          const body = await fetchProblems({ topic_id: t.id });
          const data = body as { data: Record<string, unknown>[] };
          const list = data.data.map(normalizeProblem);
          if (list.length) setTopicProblems(list.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]));
        } catch {
          // keep existing state
        }
        try {
          const topicsBody = (await fetchTopics()) as unknown as Record<string, unknown>[];
          const all = topicsBody.map(normalizeTopic).filter((x) => x.slug !== t.slug);
          const sameCat = all.filter((x) => x.category === t.category);
          setRelatedTopics([...sameCat, ...all.filter((x) => x.category !== t.category)].slice(0, 3));
        } catch {
          // related topics stay empty
        }
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const scrollToVisual = () => visualRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  if (loading && !topic) {
    return (
      <div className="space-y-6" aria-label="Loading topic">
        <div className="h-5 w-48 animate-pulse rounded bg-muted/60" />
        <Card padding="lg">
          <div className="h-8 w-1/2 animate-pulse rounded bg-muted/60" />
          <div className="mt-4 h-3 w-full animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-muted" />
        </Card>
      </div>
    );
  }

  if ((notFound || !topic) && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="text-6xl" aria-hidden>🔍</div>
        <h1 className="text-2xl font-bold text-foreground">Topic not found</h1>
        <p className="text-muted-foreground">The topic you&apos;re looking for doesn&apos;t exist.</p>
        <Link to="/topics">
          <Button variant="primary">Back to Topics</Button>
        </Link>
      </div>
    );
  }

  if (!topic) return null;

  const content = topicContents[topic.slug];
  const progress = topic.problemCount ? Math.round((topic.completedProblems / topic.problemCount) * 100) : 0;
  const displaySubtopics = topic.subtopics.slice(0, 8);
  const nextLessonIndex = Math.min(topic.completedProblems, Math.max(displaySubtopics.length - 1, 0));

  return (
    <div className="space-y-10">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <ChevronRight className="w-4 h-4" aria-hidden />
        <Link to="/topics" className="hover:text-foreground transition-colors">
          Topics
        </Link>
        <ChevronRight className="w-4 h-4" aria-hidden />
        <span className="text-foreground" aria-current="page">{topic.name}</span>
      </nav>

      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-start gap-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground border border-border">
            <TopicGlyph slug={topic.slug} className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">{topic.name}</h1>
              <Badge variant={difficultyVariant[topic.difficulty]} size="md">
                {topic.difficulty}
              </Badge>
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">{topic.category}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">{topic.description}</p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
                <span>{topic.completedProblems} / {topic.problemCount} solved</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
                <span>{topic.subtopics.length} lessons</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
                <span>~{Math.round(topic.problemCount * 18)} min</span>
              </span>
            </div>
            <div className="max-w-md pt-1">
              <ProgressBar value={topic.completedProblems} max={Math.max(topic.problemCount, 1)} size="md" label={`${progress}% complete`} showPercentage />
            </div>
            <div className="pt-2 flex flex-wrap gap-2.5">
              <Button variant="primary" icon={<Eye className="w-4 h-4" />} onClick={scrollToVisual}>
                Visualize execution
              </Button>
              <Button variant="secondary" icon={<Code2 className="w-4 h-4" />} onClick={() => navigate(`/problems?topic=${topic.slug}`)}>
                Practice Problems
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Concept & Key Ideas */}
      {content && (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card padding="lg" className="lg:col-span-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-3">
              <Lightbulb className="w-5 h-5 text-warning-400" aria-hidden /> Understand the concept
            </h2>
            <p className="text-muted-foreground leading-relaxed">{content.concept}</p>

            <h3 className="mt-6 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="w-4 h-4 text-primary" aria-hidden /> Key ideas to watch for
            </h3>
            <ul className="mt-3 space-y-2">
              {content.keyIdeas.map((idea) => (
                <li key={idea} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" aria-hidden />
                  <span>{idea}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card padding="lg">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
              <Cpu className="w-4 h-4 text-accent-foreground" aria-hidden /> Complexity
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted border border-border p-3">
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="text-sm font-mono font-semibold text-warning-400">{content.complexity.time}</p>
              </div>
              <div className="rounded-xl bg-muted border border-border p-3">
                <p className="text-xs text-muted-foreground">Space</p>
                <p className="text-sm font-mono font-semibold text-accent-foreground">{content.complexity.space}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{content.complexity.note}</p>

            <div className="mt-4 rounded-xl bg-muted border border-border p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Example</p>
              <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap overflow-x-auto">
                {content.codeExample.code}
              </pre>
              <p className="mt-2 text-xs text-muted-foreground">{content.codeExample.explanation}</p>
            </div>
          </Card>
        </div>
      )}

      {/* Operations table */}
      {content && (
        <Card padding="lg">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
            <Layers className="w-5 h-5 text-primary" aria-hidden /> Common operations
          </h2>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full min-w-96">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th scope="col" className="text-left py-2 px-2 font-medium">Operation</th>
                  <th scope="col" className="text-left py-2 px-2 font-medium">What it does</th>
                  <th scope="col" className="text-left py-2 px-2 font-medium">Time</th>
                  <th scope="col" className="text-left py-2 px-2 font-medium">Space</th>
                </tr>
              </thead>
              <tbody>
                {content.operations.map((op) => (
                  <tr key={op.name} className="border-b border-border/50 text-sm">
                    <td className="py-2.5 px-2 font-medium text-foreground font-mono text-xs">{op.name}</td>
                    <td className="py-2.5 px-2 text-muted-foreground">{op.description}</td>
                    <td className="py-2.5 px-2 font-mono text-xs text-warning-400">{op.time}</td>
                    <td className="py-2.5 px-2 font-mono text-xs text-accent-foreground">{op.space}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Learning path */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground mb-1">Learning path</h2>
        <p className="mb-4 text-sm text-muted-foreground">Work top to bottom — each lesson unlocks the next pattern.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {displaySubtopics.map((sub, i) => {
            const done = i < nextLessonIndex;
            const isNext = i === nextLessonIndex && topic.completedProblems < topic.problemCount;
            return (
              <div
                key={sub}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                  isNext
                    ? "border-primary-500/30 bg-primary-500/[0.07]"
                    : "bg-muted/40 border-border"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="w-5 h-5 text-success-400 shrink-0" aria-hidden />
                ) : isNext ? (
                  <Play className="w-5 h-5 text-primary shrink-0" aria-hidden />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground shrink-0" aria-hidden />
                )}
                <span className={`text-sm ${done ? "text-foreground" : "text-muted-foreground"}`}>{sub}</span>
                {isNext && (
                  <span className="ml-auto shrink-0 rounded-full border border-primary-500/30 bg-primary-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    Up next
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Visualizer — signature experience */}
      <div ref={visualRef} className="scroll-mt-20">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" aria-hidden /> Interactive visualizer
          </h2>
          <span className="text-xs px-2 py-1 rounded-full bg-primary-600/20 border border-primary-500/30 text-primary">
            {content?.visualType === "sorting" ? "Sorting" : content?.visualType === "array" ? "Array" : "Concept"}
          </span>
        </div>
        {/* Execution rail: code → state → change → explanation */}
        <div className="mb-4 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-muted-foreground" aria-hidden>
          {["Code line", "Current state", "Structure change", "Explanation"].map((s, i, arr) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={`rounded-full border px-2 py-0.5 ${i === 0 ? "border-primary-500/30 bg-primary-500/10 text-primary" : "border-border bg-muted/30"}`}>{s}</span>
              {i < arr.length - 1 && <span className="text-primary-500/60">→</span>}
            </span>
          ))}
        </div>

        {content?.visualType === "array" ? (
          <Card padding="lg">
            <p className="text-sm text-muted-foreground mb-4">
              Try traversal, linear search, insertion and deletion — every step highlights the line, the state, and what changed. Controls are keyboard accessible.
            </p>
            <ArrayVisualizer />
          </Card>
        ) : content?.visualType === "sorting" ? (
          <Card padding="lg">
            <p className="text-sm text-muted-foreground mb-4">
              Compare Bubble, Selection and Insertion sort step by step. Watch comparisons, swaps and the sorted partition grow.
            </p>
            <SortingVisualizer />
          </Card>
        ) : (
          <Card padding="lg" className="text-center">
            <div className="py-6">
              <Layers className="w-10 h-10 mx-auto text-muted-foreground mb-3" aria-hidden />
              <h3 className="font-medium text-foreground">Step-through visualizer for {topic.name} is on the roadmap</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-lg mx-auto">
                Meanwhile, the array and sorting visualizers below teach the same skill: reading execution one step at a time.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => navigate("/topics/arrays")}>Try the array visualizer</Button>
                <Button variant="secondary" size="sm" onClick={() => navigate("/topics/sorting")}>Try the sorting visualizer</Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Problems in this Topic */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Problems in this topic</h2>
          <Link to={`/problems?topic=${topic.slug}`} className="text-sm text-primary hover:text-primary flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </div>
        {topicProblems.length === 0 ? (
          <Card padding="md">
            <p className="text-muted-foreground text-sm">No problems listed for this topic right now.</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => navigate("/problems")}>
              Browse all problems
            </Button>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="hidden grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 bg-muted/30 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider sm:grid">
              <span>Problem</span>
              <span>Difficulty</span>
              <span>Acceptance</span>
              <span>Status</span>
            </div>
            {topicProblems.map((problem) => (
              <div
                key={problem.id}
                onClick={() => navigate(`/arena/${problem.slug}`)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate(`/arena/${problem.slug}`); }}
                role="link"
                tabIndex={0}
                className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_auto] gap-3 sm:gap-4 px-5 py-4 border-b border-border last:border-b-0 hover:bg-muted/40 cursor-pointer transition-colors items-center"
              >
                <span className="text-sm font-medium text-foreground truncate">{problem.title}</span>
                <Badge variant={problemDifficultyVariant[problem.difficulty]}>{problem.difficulty}</Badge>
                <span className="hidden text-sm text-muted-foreground w-16 text-right sm:block">{problem.acceptance}%</span>
                <span className="w-20 text-right">
                  {problem.solved ? <Badge variant="success" size="sm">Solved</Badge> : <Badge variant="default" size="sm">Not solved</Badge>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Related Topics */}
      {relatedTopics.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground mb-4">Related topics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedTopics.map((rt) => (
              <Link key={rt.id} to={`/topics/${rt.slug}`}>
                <Card hover padding="sm" className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-500/20 bg-primary-500/10 text-primary">
                    <TopicGlyph slug={rt.slug} className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{rt.name}</p>
                    <Badge variant={difficultyVariant[rt.difficulty]} size="sm">
                      {rt.difficulty}
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
