import { Component, type ErrorInfo, type ReactNode } from "react";
import { RotateCcw, WifiOff, ShieldAlert, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Kind = "network" | "server" | "permission" | "unknown";

const COPY: Record<Kind, { icon: typeof RotateCcw; title: string; body: string }> = {
  network:    { icon: WifiOff,     title: "You're offline",            body: "Averiq couldn't reach the server. Downloaded chapters still work." },
  server:     { icon: ServerCrash, title: "This didn't load",          body: "Something went wrong on our side. Your progress is saved." },
  permission: { icon: ShieldAlert, title: "You don't have access",     body: "This content isn't part of your current class or stream." },
  unknown:    { icon: RotateCcw,   title: "Something went wrong",      body: "This section failed to load. Retrying usually fixes it." },
};

export function ErrorState({
  kind = "unknown", onRetry, fallbackAction, detail,
}: {
  kind?: Kind;
  onRetry?: () => void;
  fallbackAction?: { label: string; onClick: () => void };
  /** Shown only behind a disclosure, for support — never as the headline. */
  detail?: string;
}) {
  const { icon: Icon, title, body } = COPY[kind];
  return (
    <div role="alert" className="mx-auto flex max-w-sm flex-col items-center py-16 text-center">
      <span aria-hidden className="mb-5 grid h-12 w-12 place-items-center rounded-lg border border-bad/25 bg-bad/8">
        <Icon className="h-5 w-5 stroke-[1.5] text-bad" />
      </span>
      <h2 className="t-section">{title}</h2>
      <p className="t-body-sm mt-2 text-balance text-content-secondary">{body}</p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {onRetry && <Button variant="primary" size="md" icon={<RotateCcw />} onClick={onRetry}>Try again</Button>}
        {fallbackAction && <Button variant="ghost" size="md" onClick={fallbackAction.onClick}>{fallbackAction.label}</Button>}
      </div>

      {detail && (
        <details className="mt-6 w-full text-left">
          <summary className="t-caption cursor-pointer text-content-tertiary transition-colors duration-fast hover:text-content-secondary">
            Technical details
          </summary>
          <pre className="mt-2 max-h-32 overflow-auto rounded-sm border border-line-subtle bg-surface p-3 font-mono text-[11px] leading-relaxed text-content-tertiary">
            {detail}
          </pre>
        </details>
      )}
    </div>
  );
}

/** Route-level boundary: one broken feature never blanks the whole app. */
export class RouteErrorBoundary extends Component<
  { children: ReactNode; onReset?: () => void },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[averiq] route error", error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <ErrorState
          kind="unknown"
          detail={this.state.error.message}
          onRetry={() => { this.setState({ error: null }); this.props.onReset?.(); }}
        />
      );
    }
    return this.props.children;
  }
}
