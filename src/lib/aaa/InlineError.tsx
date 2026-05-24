import { cn } from '@/lib/utils';

interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * AAA Error Recovery primitive.
 *
 * Inline, dismissible, retryable. Never replaces the page. The user keeps
 * their context and unsaved work.
 */
export function InlineError({ message, onRetry, onDismiss, className }: InlineErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3',
        className,
      )}
    >
      <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-destructive" />
      <span className="flex-1 text-sm text-destructive">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-medium text-destructive underline-offset-2 hover:underline"
        >
          Retry
        </button>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-sm text-destructive/70 hover:text-destructive"
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
}
