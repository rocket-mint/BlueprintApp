import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

// Catches render errors anywhere in the children tree and shows them inline
// instead of letting the whole page go blank. Helpful while iterating on
// components — surfaces the actual stack trace right in the UI.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ error, info });
    // Also log to the console so DevTools shows the full stack
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught:", error, info);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div className="m-6 rounded-2xl border-2 border-semantic-error/40 bg-semantic-error/5 p-6">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-semantic-error">
          Render error
        </div>
        <div className="mb-3 text-base font-bold text-brand-navy-900">
          {this.state.error.message}
        </div>
        {this.state.error.stack && (
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-white p-3 text-[11px] leading-snug text-neutral-gray-700">
            {this.state.error.stack}
          </pre>
        )}
        {this.state.info?.componentStack && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-semibold text-neutral-gray-600">
              Component stack
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-white p-3 text-[11px] leading-snug text-neutral-gray-700">
              {this.state.info.componentStack}
            </pre>
          </details>
        )}
      </div>
    );
  }
}
