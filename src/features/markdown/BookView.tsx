import { FC, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DiaryPage, formatPageDate } from "@src/features/markdown/lib/pages";
import { parseMarkdown } from "@src/lib/utils/parseMarkdown";
import Button from "@src/components/ui/button/Button";

/** Space between two pages (and between two spreads). */
const GAP = 32;
/** Padding of the reading area; the same numbers as the px-3 / py-2 classes below. */
const PAD_X = 12;
const PAD_Y = 8;

const NAV_BUTTON =
	"p-1.5 rounded-full hover:bg-gray-500/20 disabled:opacity-30 disabled:hover:bg-transparent";

interface BookViewProps {
	pages: DiaryPage[];
	/** Pages shown side by side. */
	spread: 1 | 2;
}

/**
 * Read-only book: the whole note is laid out as text columns the height of the
 * screen, and turning a page slides to the next column. The browser decides
 * where each page ends, so the same note fills any screen, and nothing about the
 * page breaks is ever saved. Every dated entry starts on a fresh page.
 */
const BookView: FC<BookViewProps> = ({ pages, spread }) => {
	const viewportRef = useRef<HTMLDivElement>(null);
	const columnsRef = useRef<HTMLDivElement>(null);
	const [size, setSize] = useState({ width: 0, height: 0 });
	const [pageCount, setPageCount] = useState(1);
	// The date of the entry each page belongs to (an entry can run over several pages).
	const [pageDates, setPageDates] = useState<string[]>([]);
	// The first page on screen (0-based). Remembering a page rather than a spread
	// keeps you on the same text when you switch between one and two pages.
	const [firstPage, setFirstPage] = useState(0);

	// Follow the size of the reading area.
	useLayoutEffect(() => {
		const el = viewportRef.current;
		if (!el) return;
		const measure = () =>
			setSize((old) =>
				old.width === el.clientWidth && old.height === el.clientHeight
					? old
					: { width: el.clientWidth, height: el.clientHeight },
			);
		measure();
		if (typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(measure);
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	// The reading area inside its padding, then one page column inside that.
	const innerWidth = Math.max(0, size.width - PAD_X * 2);
	const innerHeight = Math.max(0, size.height - PAD_Y * 2);
	const columnWidth = Math.max(0, (innerWidth - GAP * (spread - 1)) / spread);

	// Count the pages the browser made out of the text.
	useLayoutEffect(() => {
		const el = columnsRef.current;
		if (!el) return;
		const count = Math.max(1, Math.round((el.scrollWidth + GAP) / (columnWidth + GAP)));
		setPageCount(count);

		// Each entry starts on a fresh page; find which page that is.
		const starts = Array.from(el.querySelectorAll<HTMLElement>("[data-testid='book-entry']")).map(
			(article) => Math.max(0, Math.round(article.offsetLeft / (columnWidth + GAP))),
		);
		const dates: string[] = [];
		for (let page = 0; page < count; page++) {
			let owner = 0;
			let ownerStart = -1;
			starts.forEach((start, i) => {
				if (start <= page && start > ownerStart) {
					owner = i;
					ownerStart = start;
				}
			});
			dates.push(formatPageDate(pages[owner]?.date ?? "") || "Undated");
		}
		setPageDates((old) => (old.join("|") === dates.join("|") ? old : dates));
	}, [pages, size, spread, columnWidth]);

	const spreads = Math.max(1, Math.ceil(pageCount / spread));
	const current = Math.min(Math.floor(firstPage / spread), spreads - 1);
	const first = current * spread + 1;
	const last = Math.min(first + spread - 1, pageCount);
	const shownDates = Array.from(new Set(pageDates.slice(first - 1, last)));

	const go = (next: number) =>
		setFirstPage(Math.min(Math.max(0, next), spreads - 1) * spread);

	// Arrow keys turn pages.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "ArrowLeft") go(current - 1);
			if (e.key === "ArrowRight") go(current + 1);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [current, spreads]);

	return (
		<div className="flex min-h-0 flex-1 flex-col rounded-lg border border-gray-500/30 bg-gray-500/10">
			<div className="flex min-h-10 items-center gap-1 border-b border-gray-500/20 px-1 py-1">
				<Button
					type="button"
					onClick={() => go(current - 1)}
					disabled={current === 0}
					aria-label="Previous page"
					className={NAV_BUTTON}
				>
					<ChevronLeft className="h-5 w-5" />
				</Button>
				<div
					data-testid="page-date"
					className="min-w-0 flex-1 truncate text-center text-sm font-medium text-gray-600 dark:text-gray-300"
				>
					{shownDates.join("  ·  ")}
				</div>
				<div
					data-testid="page-counter"
					className="shrink-0 whitespace-nowrap px-1 text-xs text-gray-500 dark:text-gray-400"
				>
					{first === last ? `Page ${first}` : `Pages ${first}–${last}`} of {pageCount}
				</div>
				<Button
					type="button"
					onClick={() => go(current + 1)}
					disabled={current >= spreads - 1}
					aria-label="Next page"
					className={NAV_BUTTON}
				>
					<ChevronRight className="h-5 w-5" />
				</Button>
			</div>

			<div ref={viewportRef} className="relative min-h-0 flex-1 overflow-hidden px-3 py-2">
				<div
					ref={columnsRef}
					data-testid="book-columns"
					className="absolute left-3 top-2 text-[15px] leading-7 transition-transform duration-300"
					style={{
						// Columns are as tall as the reading area; the text that does not
						// fit flows into more columns to the right. A spread is `spread`
						// columns wide, and the next one starts one gap further on.
						width: innerWidth,
						height: innerHeight,
						columnWidth: columnWidth > 0 ? columnWidth : undefined,
						columnGap: GAP,
						columnFill: "auto",
						columnRule: spread === 2 ? "1px solid rgba(128,128,128,0.3)" : undefined,
						transform: `translateX(-${current * (innerWidth + GAP)}px)`,
					}}
				>
					{pages.map((page, i) => (
						<article
							key={i}
							data-testid="book-entry"
							// Every entry after the first starts a new page.
							style={i > 0 ? { breakBefore: "column" } : undefined}
						>
							{parseMarkdown(page.body)}
						</article>
					))}
				</div>
			</div>
		</div>
	);
};

export default BookView;
