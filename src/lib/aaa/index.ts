/**
 * AAA Classification Standard primitives.
 *
 * Four vectors of white-glove finish:
 *   1. Response Fidelity   — useOptimisticState
 *   2. Spatial Consistency — StableImage
 *   3. Progressive Disclosure — ActionGroup
 *   4. Error Recovery      — InlineError
 *
 * Apply to any new surface before calling it "done".
 */
export { useOptimisticState } from './useOptimisticState';
export type { SyncStatus } from './useOptimisticState';
export { StableImage } from './StableImage';
export { ActionGroup } from './ActionGroup';
export { InlineError } from './InlineError';
