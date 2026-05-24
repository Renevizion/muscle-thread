/**
 * Global UI Pattern Registry — the source of truth for the propagation audit.
 *
 * Every entry says: "this pattern should appear in these route/component
 * files, and here's how to detect it". The audit script (scripts/audit-propagate.ts)
 * walks the codebase against this registry and fails CI if anything is missing.
 *
 * Add a new pattern here the moment you ship one. If it isn't in the registry,
 * the audit can't enforce it.
 */
export interface PatternConfig {
  /** File globs (relative to repo root) where the pattern must appear. */
  files: string[];
  /** Substrings/JSX component names — pattern passes if ANY appears in the file. */
  matchers: string[];
  /** Human-readable description shown in audit output. */
  description: string;
}

export const UI_PATTERNS: Record<string, PatternConfig> = {
  // Auth must exist on every protected route.
  authGuard: {
    files: ['src/pages/Index.tsx'],
    matchers: ['ProtectedRoute', 'useAuth'],
    description: 'Protected pages must check auth state',
  },
  // Every async input surface should preserve work across logout/refresh.
  draftPersistence: {
    files: ['src/components/ExerciseLogModal.tsx'],
    matchers: ['draftKey', 'localStorage'],
    description: 'Input modals autosave drafts so logout/refresh never loses work',
  },
  // AAA Response Fidelity — optimistic state on any mutation surface.
  // (Aspirational — extend `files` as we adopt the primitive.)
  optimisticState: {
    files: ['src/lib/aaa/useOptimisticState.ts'],
    matchers: ['useOptimisticState'],
    description: 'Mutations should feel <100ms via optimistic local state',
  },
  // AAA Spatial Consistency — async images must reserve space.
  stableImage: {
    files: ['src/lib/aaa/StableImage.tsx'],
    matchers: ['aspectRatio', 'StableImage'],
    description: 'Async images must reserve their final box before paint',
  },
  // AAA Error Recovery — inline, retryable errors instead of full-page red walls.
  inlineError: {
    files: ['src/lib/aaa/InlineError.tsx'],
    matchers: ['InlineError', 'onRetry'],
    description: 'Failed mutations show inline, dismissible, retryable errors',
  },
  // Workout screens must offer a catch-up slot (substitute/missed logging).
  catchUpSlot: {
    files: ['src/components/WorkoutView.tsx'],
    matchers: ['catchUpSlot', 'CatchUpInline'],
    description: 'Every workout day surface exposes the catch-up logger',
  },
};

/** Forbidden tokens — fail the audit if any production file ships these. */
export const FORBIDDEN_TOKENS: { token: string; reason: string; ignore?: RegExp }[] = [
  { token: 'lorem ipsum', reason: 'Placeholder copy shipped to production' },
  { token: 'TODO:', reason: 'Unresolved TODO in shipped code', ignore: /scripts\// },
  { token: 'FIXME', reason: 'Unresolved FIXME in shipped code' },
];
