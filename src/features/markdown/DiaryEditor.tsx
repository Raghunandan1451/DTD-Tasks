import {
	FC,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import {
	ArrowLeft,
	ChevronLeft,
	ChevronRight,
	FilePlus2,
} from "lucide-react";
import { RootState } from "@src/lib/store/store";
import { updateFileContent } from "@src/lib/store/slices/markdownSlice";
import {
	DiaryPage,
	paginateText,
	parsePages,
	serializePages,
	todayKey,
} from "@src/features/markdown/lib/pages";
import PageCard from "@src/features/markdown/PageCard";
import ModeSelector, {
	EditorMode,
} from "@src/components/shared/preview_editor/ModeSelector";
import Button from "@src/components/ui/button/Button";

interface DiaryEditorProps {
	className?: string;
	/** Mobile-only: return to the file list */
	onBack?: () => void;
}

const VIEW_KEY = "diary:pagesPerView";
const WIDE = "(min-width: 768px)";

const NAV_BUTTON =
	"p-1.5 rounded-full hover:bg-gray-500/20 disabled:opacity-30 disabled:hover:bg-transparent";

const readView = (): 1 | 2 => {
	try {
		return localStorage.getItem(VIEW_KEY) === "2" ? 2 : 1;
	} catch {
		return 1;
	}
};

/** Two pages side by side only make sense on a wide screen. */
function useIsWide(): boolean {
	return useSyncExternalStore(
		(onChange) => {
			const mq = window.matchMedia?.(WIDE);
			mq?.addEventListener("change", onChange);
			return () => mq?.removeEventListener("change", onChange);
		},
		() => window.matchMedia?.(WIDE).matches ?? false,
		() => false,
	);
}

/**
 * Diary layout: a file is shown one page (or a two-page spread) at a time.
 * Preview (default) is read-only; Edit styles markdown inline as you type and
 * flows overflowing text onto a new page instead of scrolling. Page dates are
 * written when a page is added and are never editable.
 */
const DiaryEditor: FC<DiaryEditorProps> = ({ className = "", onBack }) => {
	const { selectedFile, content } = useSelector(
		(state: RootState) => state.fileManager,
	);
	const dispatch = useDispatch();

	const [mode, setMode] = useState<EditorMode>("preview");
	const [index, setIndex] = useState(0);
	const [preferredView, setPreferredView] = useState<1 | 2>(readView);
	const wide = useIsWide();
	const view: 1 | 2 = preferredView === 2 && wide ? 2 : 1;

	const textareas = useRef<Record<number, HTMLTextAreaElement | null>>({});
	const caretRef = useRef<{ page: number; pos: number } | null>(null);

	const pages = useMemo(() => parsePages(content || ""), [content]);
	const focus = Math.min(index, pages.length - 1);
	// A spread always starts on the same side of the book.
	const start = focus - (focus % view);
	const visible = Array.from({ length: view }, (_, k) => start + k);

	const registerTextarea = useCallback(
		(i: number, el: HTMLTextAreaElement | null) => {
			textareas.current[i] = el;
		},
		[],
	);

	// Put the caret where the typed text ended up after a page flow, and
	// focus the first visible page when entering edit mode.
	useLayoutEffect(() => {
		const pending = caretRef.current;
		if (pending) {
			const el = textareas.current[pending.page];
			if (el) {
				el.focus();
				el.setSelectionRange(pending.pos, pending.pos);
			}
			caretRef.current = null;
			return;
		}
		if (mode !== "edit") return;
		const active = document.activeElement;
		const typing = Object.values(textareas.current).some((t) => t === active);
		if (!typing) textareas.current[start]?.focus();
	}, [content, start, mode, view]);

	// Arrow keys turn pages while reading (never while typing).
	useEffect(() => {
		if (mode !== "preview") return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "ArrowLeft") setIndex(Math.max(0, start - view));
			if (e.key === "ArrowRight" && start + view < pages.length)
				setIndex(start + view);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [mode, start, view, pages.length]);

	if (!selectedFile) {
		return (
			<div className={`flex-1 items-center justify-center ${className}`}>
				<p>Select a file to start reading</p>
			</div>
		);
	}

	const save = (next: DiaryPage[]) =>
		dispatch(
			updateFileContent({ path: selectedFile, content: serializePages(next) }),
		);

	const changeView = (next: 1 | 2) => {
		setPreferredView(next);
		try {
			localStorage.setItem(VIEW_KEY, String(next));
		} catch {
			/* preference just won't persist */
		}
	};

	const handleEdit = (
		i: number,
		value: string,
		caret: number,
		fits: (s: string) => boolean,
	) => {
		const { chunks, starts } = paginateText(value, fits);

		if (chunks.length === 1) {
			save(pages.map((p, n) => (n === i ? { ...p, body: value } : p)));
			return;
		}

		// Overflow: keep the head here, flow the rest onto new pages dated today.
		const today = todayKey();
		save([
			...pages.slice(0, i),
			{ ...pages[i], body: chunks[0] },
			...chunks.slice(1).map((body) => ({ date: today, body })),
			...pages.slice(i + 1),
		]);

		let k = 0;
		starts.forEach((s, n) => {
			if (s <= caret) k = n;
		});
		const pos = Math.min(caret - starts[k], chunks[k].length);
		caretRef.current = { page: i + k, pos };
		setIndex(i + k);
	};

	const addPage = () => {
		save([...pages, { date: todayKey(), body: "" }]);
		setIndex(pages.length);
	};

	const deletePage = (i: number) => {
		if (pages.length < 2) return;
		if (!window.confirm("Delete this page?")) return;
		save(pages.filter((_, n) => n !== i));
		setIndex(Math.max(0, i - 1));
	};

	const prev = (
		<Button
			type="button"
			onClick={() => setIndex(Math.max(0, start - view))}
			disabled={start === 0}
			aria-label="Previous page"
			className={NAV_BUTTON}
		>
			<ChevronLeft className="h-5 w-5" />
		</Button>
	);
	const next = (
		<Button
			type="button"
			onClick={() => setIndex(start + view)}
			disabled={start + view >= pages.length}
			aria-label="Next page"
			className={NAV_BUTTON}
		>
			<ChevronRight className="h-5 w-5" />
		</Button>
	);

	const viewButton = (n: 1 | 2) => (
		<Button
			key={n}
			type="button"
			onClick={() => changeView(n)}
			aria-label={n === 1 ? "Show one page" : "Show two pages"}
			aria-pressed={preferredView === n}
			title={n === 1 ? "One page" : "Two pages"}
			className={`px-2 py-2 rounded text-sm transition-colors ${
				preferredView === n
					? "bg-blue-600 text-white"
					: "text-gray-300 hover:bg-gray-600"
			}`}
		>
			{n}
		</Button>
	);

	return (
		<div
			className={`flex-1 min-w-0 p-2 bg-white/30 dark:bg-black/30 text-gray-900 dark:text-gray-100 backdrop-blur-md shadow-sm flex-col min-h-0 ${className}`}
		>
			<div className="flex items-center justify-between gap-2 mb-2">
				{onBack && (
					<Button
						type="button"
						onClick={onBack}
						aria-label="Back to files"
						className="md:hidden p-2 -ml-1 rounded-md hover:bg-gray-500/20"
					>
						<ArrowLeft className="h-5 w-5" />
					</Button>
				)}
				<h2 className="text-lg font-bold break-all min-w-0 flex-1 truncate">
					{selectedFile}
				</h2>
				{mode === "edit" && (
					<Button
						type="button"
						onClick={addPage}
						aria-label="Add page"
						title="Add page dated today"
						className="p-2 rounded-lg bg-gray-700/50 text-gray-300 hover:bg-gray-600"
					>
						<FilePlus2 className="h-5 w-5" />
					</Button>
				)}
				<div
					role="group"
					aria-label="Pages shown"
					className="hidden md:flex gap-1 bg-gray-700/50 rounded-lg p-1"
				>
					{viewButton(1)}
					{viewButton(2)}
				</div>
				<ModeSelector
					currentMode={mode}
					allowedModes={["preview", "edit"]}
					onModeChange={setMode}
				/>
			</div>

			<div className="flex flex-1 min-h-0 gap-2">
				{visible.map((i, slot) => (
					<PageCard
						key={i}
						page={pages[i] ?? null}
						index={i}
						total={pages.length}
						mode={mode}
						onEdit={handleEdit}
						onDelete={deletePage}
						registerTextarea={registerTextarea}
						leftSlot={slot === 0 ? prev : undefined}
						rightSlot={slot === view - 1 ? next : undefined}
					/>
				))}
			</div>
		</div>
	);
};

export default DiaryEditor;
