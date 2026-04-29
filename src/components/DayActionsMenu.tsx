import { useState } from 'react';
import { Clock, ArrowRightLeft, SkipForward, MoreHorizontal, RotateCcw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { dayLabels, WorkoutDay } from '@/data/workoutPlan';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DayActionsMenuProps {
  todaySlotId: number; // 1..7 (Mon..Sun) — the calendar slot being viewed
  workoutPlan: WorkoutDay[];
  onSwap: (otherSlotId: number) => void;
  onSkipToday: () => void;
  onRemindLater: (minutes: number) => void;
  onResetWeek: () => void;
  hasOverrides: boolean;
}

export function DayActionsMenu({
  todaySlotId,
  workoutPlan,
  onSwap,
  onSkipToday,
  onRemindLater,
  onResetWeek,
  hasOverrides,
}: DayActionsMenuProps) {
  const [swapOpen, setSwapOpen] = useState(false);

  const handleLater = (minutes: number, label: string) => {
    onRemindLater(minutes);
    toast.success(`Got it — I'll nudge you ${label}.`);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Day options"
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0"
          >
            <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>I can't right now…</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => handleLater(60, 'in 1 hour')}>
            <Clock className="w-4 h-4 mr-2" />
            Remind me in 1 hour
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleLater(180, 'in 3 hours')}>
            <Clock className="w-4 h-4 mr-2" />
            Remind me in 3 hours
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleLater(60 * 8, 'tonight')}>
            <Clock className="w-4 h-4 mr-2" />
            Remind me tonight
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSwapOpen(true)}>
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Push to another day…
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              onSkipToday();
              toast.success("Today marked as rest — no guilt, get it tomorrow.");
            }}
          >
            <SkipForward className="w-4 h-4 mr-2" />
            Skip today (treat as rest)
          </DropdownMenuItem>
          {hasOverrides && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  onResetWeek();
                  toast.success('Week reset to original plan.');
                }}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset this week
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={swapOpen} onOpenChange={setSwapOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Push today to…</DialogTitle>
            <DialogDescription>
              Swap today's workout with another day this week. Your plan stays the same — just the
              order shifts.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2 py-2">
            {workoutPlan
              .filter(d => d.id !== todaySlotId)
              .map(d => (
                <button
                  key={d.id}
                  onClick={() => {
                    onSwap(d.id);
                    setSwapOpen(false);
                    toast.success(
                      `Swapped with ${dayLabels[d.id - 1] ?? `Day ${d.id}`}.`
                    );
                  }}
                  className={cn(
                    'flex items-center justify-between w-full p-3 rounded-xl bg-secondary hover:bg-secondary/70 transition-colors text-left'
                  )}
                >
                  <div>
                    <div className="font-display font-semibold text-sm">
                      {dayLabels[d.id - 1] ?? `Day ${d.id}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {d.name || (d.type === 'rest' ? 'Rest' : d.type === 'conditioning' ? 'Conditioning' : 'Training')}
                    </div>
                  </div>
                  <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
          </div>
          <DialogFooter>
            <button
              onClick={() => setSwapOpen(false)}
              className="w-full py-2 rounded-lg bg-secondary text-sm font-medium"
            >
              Cancel
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
