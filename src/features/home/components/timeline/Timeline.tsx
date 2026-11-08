import React, { useState } from "react";
import { ChevronDown, PenLine } from "lucide-react";
import Button from "@src/components/ui/button/Button";
import { ConfirmationModal } from "@src/components/shared/dialog/ConfirmModal";
import InfiniteScrollTrigger from "@src/components/shared/infinite_scroll/InfiniteScrollTrigger";
import FilterChips from "@src/features/home/components/timeline/FilterChips";
import JournalComposer from "@src/features/home/components/timeline/JournalComposer";
import OnThisDayCard from "@src/features/home/components/timeline/OnThisDayCard";
import TimelineDayView from "@src/features/home/components/timeline/TimelineDayView";
import {
  TimelineEmpty,
  TimelineError,
  TimelineSkeleton,
} from "@src/features/home/components/timeline/TimelineStates";
import { TimelineActionsContext } from "@src/features/home/lib/timelineActions";
import { useOnThisDay } from "@src/features/home/lib/useOnThisDay";
import { useTimeline } from "@src/features/home/lib/useTimeline";
import { useTimelineActionsProvider } from "@src/features/home/lib/useTimelineActionsProvider";

interface TimelineProps {
  showNotification?: (
    message: string,
    type?: "info" | "error" | "success",
  ) => void;
}

const Timeline: React.FC<TimelineProps> = ({ showNotification }) => {
  const {
    rows,
    status,
    refresh,
    filter,
    setFilter,
    hasMore,
    loadingMore,
    loadMore,
  } = useTimeline();
  const { actions, dialog } = useTimelineActionsProvider(
    refresh,
    showNotification,
  );
  const onThisDay = useOnThisDay();
  const [composerOpen, setComposerOpen] = useState(false);

  const handlePosted = () => {
    setComposerOpen(false);
    refresh();
  };

  return (
    <TimelineActionsContext.Provider value={actions}>
      <section
        className="tl flex min-h-0 flex-1 flex-col px-2 pt-2"
        aria-label="Activity timeline"
      >
        <div className="min-h-0 flex-1 overflow-y-auto pb-4 scrollbar-hide">
          {(filter === "all" || filter === "journal") && (
            <OnThisDayCard entries={onThisDay} />
          )}
          {status === "loading" && <TimelineSkeleton />}
          {status === "error" && <TimelineError onRetry={refresh} />}
          {status === "ready" && rows.length === 0 && (
            <TimelineEmpty filter={filter} />
          )}
          {status === "ready" && rows.length > 0 && (
            <ol className="mx-auto max-w-6xl">
              {rows.map((row) =>
                row.type === "gap" ? (
                  <li key={row.key} className="tl-gap" aria-hidden="true">
                    <span className="tl-gap-label text-xs text-gray-500 dark:text-gray-400">
                      {row.skippedDays} days with no activity
                    </span>
                  </li>
                ) : (
                  <TimelineDayView key={row.key} row={row} />
                ),
              )}
            </ol>
          )}

          {status === "ready" && (
            <InfiniteScrollTrigger
              hasMore={hasMore}
              loading={loadingMore}
              onLoadMore={loadMore}
            />
          )}
        </div>
        <div className="mx-auto w-full max-w-6xl shrink-0 py-2">
          {composerOpen && (
            <div
              id="journal-composer"
              className="mb-2 max-h-[55vh] overflow-y-auto scrollbar-hide"
            >
              <JournalComposer
                onPosted={handlePosted}
                showNotification={showNotification}
              />
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <Button
              type="button"
              onClick={() => setComposerOpen((open) => !open)}
              aria-expanded={composerOpen}
              aria-controls="journal-composer"
              className="btn-glass-unselected flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              {composerOpen ? (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              ) : (
                <PenLine className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{composerOpen ? "Hide note" : "New note"}</span>
            </Button>
            <FilterChips value={filter} onChange={setFilter} />
          </div>
        </div>
      </section>
      <ConfirmationModal
        isOpen={dialog.isOpen}
        options={dialog.options}
        onConfirm={dialog.handleConfirm}
        onCancel={dialog.handleCancel}
      />
    </TimelineActionsContext.Provider>
  );
};

export default Timeline;
