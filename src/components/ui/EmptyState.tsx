import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/shadcn/ui/card";
import { Button } from "@/components/shadcn/ui/button";

type Props = {
  title: string;
  hint?: string;
  actionLabel?: string;
  actionTo?: string;
  icon?: React.ReactNode;
};

/** Consistent empty state used across dashboard, topics, problems, leaderboard. */
export default function EmptyState({ title, hint, actionLabel, actionTo, icon }: Props) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center px-6 py-8 text-center">
        {icon && (
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
            {icon}
          </div>
        )}
        <h3 className="font-semibold text-foreground">{title}</h3>
        {hint && <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{hint}</p>}
        {actionLabel && actionTo && (
          <Button asChild className="mt-4">
            <Link to={actionTo}>{actionLabel}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
