import { Link } from "react-router-dom";
import {
  Code2,
  BookOpen,
  Layers,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Binary,
  GitBranch,
  Network,
  Search,
  ChevronRight,
} from "lucide-react";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Button } from "@/components/shadcn/ui/button";

const curriculumTopics = [
  { name: "Arrays & Strings", category: "Data Structures", count: "12 problems", difficulty: "Beginner", slug: "arrays" },
  { name: "Linked Lists", category: "Data Structures", count: "8 problems", difficulty: "Beginner", slug: "linked-lists" },
  { name: "Trees & Binary Trees", category: "Data Structures", count: "14 problems", difficulty: "Intermediate", slug: "trees" },
  { name: "Graphs", category: "Data Structures", count: "10 problems", difficulty: "Advanced", slug: "graphs" },
  { name: "Sorting & Searching", category: "Algorithms", count: "10 problems", difficulty: "Beginner", slug: "sorting" },
  { name: "Dynamic Programming", category: "Algorithms", count: "16 problems", difficulty: "Advanced", slug: "dynamic-programming" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* 1. Clean Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
              <Code2 className="w-4 h-4" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-foreground">FORGE</span>
          </Link>

          {/* Center Navigation */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
            <Link to="/topics" className="hover:text-foreground transition-colors">
              Learn
            </Link>
            <Link to="/problems" className="hover:text-foreground transition-colors">
              Problems
            </Link>
            <Link to="/topics/arrays" className="hover:text-foreground transition-colors">
              3D Visualizer
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <ModeToggle />
            <Link
              to="/login"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors px-3 py-1.5"
            >
              Sign In
            </Link>
            <Button asChild size="sm" className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs px-4">
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 sm:pt-24 sm:pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-accent text-accent-foreground border border-border mb-6">
            <span>Student-focused DSA platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground leading-[1.12]">
            Learn DSA by practicing, understanding, and visualizing.
          </h1>

          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A friendly, structured platform for college students to master Data Structures and Algorithms through curated practice, step-by-step visualizers, and a patient AI mentor.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Button asChild size="lg" className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm px-6 h-11 w-full sm:w-auto shadow-xs">
              <Link to="/signup">
                Start Learning Free <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-lg border-border bg-card text-foreground hover:bg-secondary font-medium text-sm px-6 h-11 w-full sm:w-auto">
              <Link to="/problems">Explore Problems</Link>
            </Button>
          </div>

          {/* Quick value badges */}
          <div className="mt-12 pt-8 border-t border-border flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> 14 Structured Topic Modules
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Interactive Execution Visualizer
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Guided AI Hints (No Full Spoilers)
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Free for Students
            </span>
          </div>
        </section>

        {/* 3. Core Pillars (Simple 4-column layout) */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="text-center max-w-xl mx-auto mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Everything you need to master DSA
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Designed to help you understand foundational concepts and crack technical interviews with confidence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Practice */}
            <div className="p-6 rounded-xl border border-border bg-card space-y-3">
              <div className="w-9 h-9 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
                <Code2 className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-foreground">Practice</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Solve structured DSA problems with an in-browser code editor supporting Python, TypeScript, and C++.
              </p>
            </div>

            {/* Understand */}
            <div className="p-6 rounded-xl border border-border bg-card space-y-3">
              <div className="w-9 h-9 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-foreground">Understand</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Learn core concepts and recurring problem patterns clearly before jumping into brute-force coding.
              </p>
            </div>

            {/* Visualize */}
            <div className="p-6 rounded-xl border border-border bg-card space-y-3">
              <div className="w-9 h-9 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-foreground">Visualize</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                See pointer movements, array swaps, and recursive tree splits step by step on an interactive canvas.
              </p>
            </div>

            {/* Get Help */}
            <div className="p-6 rounded-xl border border-border bg-card space-y-3">
              <div className="w-9 h-9 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-foreground">Get Help</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ask the built-in AlgoMentor when stuck. It prompts you with guided questions rather than giving away answers.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Curriculum Preview */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Structured Curriculum
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                From basic pointer logic to dynamic programming state transitions.
              </p>
            </div>
            <Link
              to="/topics"
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1 self-start sm:self-auto"
            >
              View all 14 topics <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {curriculumTopics.map((topic) => (
              <Link
                key={topic.name}
                to={`/topics/${topic.slug}`}
                className="p-5 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors block group"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    {topic.category}
                  </span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    topic.difficulty === "Beginner"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : topic.difficulty === "Intermediate"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-red-500/10 text-red-600 dark:text-red-400"
                  }`}>
                    {topic.difficulty}
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                  {topic.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {topic.count}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* 5. Simple Call to Action */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="p-8 sm:p-10 rounded-2xl border border-border bg-card space-y-4">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Ready to build stronger algorithmic thinking?
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Join students practicing on FORGE today. Create a free account in less than a minute.
            </p>
            <div className="pt-2">
              <Button asChild size="lg" className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm px-6 h-10 shadow-xs">
                <Link to="/signup">
                  Create Free Account <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* 6. Clean Footer */}
      <footer className="w-full border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-[10px]">
              <Code2 className="w-3 h-3" />
            </div>
            <span className="font-medium text-foreground">FORGE</span>
            <span>— A student-focused DSA learning platform.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/topics" className="hover:text-foreground transition-colors">Topics</Link>
            <Link to="/problems" className="hover:text-foreground transition-colors">Problems</Link>
            <Link to="/login" className="hover:text-foreground transition-colors">Sign In</Link>
            <Link to="/signup" className="hover:text-foreground transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
