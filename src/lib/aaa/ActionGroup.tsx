import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ActionGroupProps {
  primary: ReactNode;
  secondary?: ReactNode[];
  className?: string;
}

/**
 * AAA Progressive Disclosure primitive.
 *
 * Primary action is always visible. Secondary actions reveal on hover/focus
 * (and stay visible on touch via focus-within). Keeps the 80% case clean.
 */
export function ActionGroup({ primary, secondary = [], className }: ActionGroupProps) {
  return (
    <div className={cn('group flex items-center gap-1', className)}>
      <div className="flex-1 min-w-0">{primary}</div>
      {secondary.length > 0 && (
        <div className="flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
          {secondary.map((action, i) => (
            <span key={i}>{action}</span>
          ))}
        </div>
      )}
    </div>
  );
}
