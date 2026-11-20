import {
	FC,
	useCallback,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { ArrowLeft, BookOpen, FilePlus2, Merge, ScrollText } from "lucide-react";
import { RootState } from "@src/lib/store/store";
import { updateFileContent } from "@src/lib/store/slices/markdownSlice";
import {
	DiaryPage,
	formatPageDate,
	mergeSameDayPages,
	parsePages,
	serializePages,
	todayKey,
} from "@src/features/markdown/lib/pages";
import EntryCard from "@src/features/markdown/EntryCard";
import BookView from "@src/features/markdown/BookView";
import { ConfirmationModal } from "@src/components/shared/dialog/ConfirmModal";
import { useConfirmationModal } from "@src/lib/hooks/useConfirmDialog";
import ModeSelector, {
	EditorMode,
} from "@src/components/shared/preview_editor/ModeSelector";
import Button from "@src/components/ui/button/Button";

interface DiaryEditorProps {
	className?: string;
	/** Mobile-only: return to the file list */
	onBack?: () => void;
}

type DiaryView = "scroll" | "book";

const VIEW_KEY = "diary:view";
// Same key the old one/two page buttons used, so that choice is kept.
const SPREAD_KEY = "diary:pagesPerView";
const WIDE = "(min-width: 768px)";

const readStored = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
	try {
		const value = localStorage.getItem(key);
		return allowed.find((option) => option === value) ?? fallback;
	} catch {
		return fallback;
	}
};

const writeStored = (key: string, value: string) => {
	try {
		localStorage.setItem(key, value);
	} catch {
		/* the choice just won't be remembered */
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

const TOGGLE_GROUP = "flex gap-1 bg-gray-700/50 rounded-lg p-1";

/**
 * A file is a list of dated entries. Scroll view (the default) is where you
 * write: every entry is a card as tall as its text and the whole note scrolls,
 * so nothing is ever cut into extra pages by the size of your screen. Book view
 * is for reading only: it lays the same text out as pages that fit whatever
 * screen you are on, and saves nothing. Page dates are written when a page is
 * added and are never editable.
 */
const DiaryEditor: FC<DiaryEditorProps> = ({ className = "", onBack }) => {
	const { selectedFile, content } = useSelector(
		(state: RootState) => state.fileManager,
	);
	const dispatch = useDispatch();
	const confirmation = useConfirmationModal();

	// An empty note (for example one just created) opens ready to type in, in the
	// scroll view; the parent remounts this editor per file, so this runs once per open.
	const [mode, setMode] = useState<EditorMode>(() =>
		content.trim() === "" ? "edit" : "preview",
	);
	const [view, setView] = useState<DiaryView>(() =>
		content.trim() === "" ? "scroll" : readStored<DiaryView>(VIEW_KEY, ["scroll", "book"], "scroll"),
	);
	const [preferredSpread, setPreferredSpread] = useState<1 | 2>(() =>
		readStored(SPREAD_KEY, ["1", "2"], "1") === "2" ? 2 : 1,
	);
	const wide = useIsWide();
	const spread: 1 | 2 = preferredSpread === 2 && wide ? 2 : 1;

	const textareas = useRef<Record<number, HTMLTextAreaElement | null>>({});
	// A page that was just added and should get the cursor.
	const focusAfterRender = useRef<number | null>(null);

	const pages = useMemo(() => parsePages(content || ""), [content]);
	const merge = useMemo(() => mergeSameDayPages(pages), [pages]);

	const registerTextarea = useCallback(
		(i: number, el: HTMLTextAreaElement | null) => {
			textareas.current[i] = el;
		},
		[],
	);

	// Put the cursor at the end of the new page, or of the last page when edit mode
	// starts, unless the user is already typing somewhere.
	useLayoutEffect(() => {
		if (view !== "scroll" || mode !== "edit") return;
		const target = focusAfterRender.current ?? null;
		focusAfterRender.current = null;
		const active = document.activeElement;
		const typing = Object.values(textareas.current).some((t) => t === active);
		if (target === null && typing) return;
		const el = textareas.current[target ?? pages.length - 1];
		if (!el) return;
		el.focus();
		el.setSelectionRange(el.value.length, el.value.length);
		el.scrollIntoView?.({ block: "nearest" });
	}, [mode, view, pages.length]);

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

	const changeView = (next: DiaryView) => {
		setView(next);
		writeStored(VIEW_KEY, next);
		// The book is read-only.
		if (next === "book") setMode("preview");
	};

	const changeSpread = (next: 1 | 2) => {
		setPreferredSpread(next);
		writeStored(SPREAD_KEY, String(next));
	};

	// Typing only ever changes the text of the page being typed in.
	const handleEdit = (i: number, value: string) => {
		save(pages.map((p, n) => (n === i ? { ...p, body: value } : p)));
	};

	const addPage = () => {
		focusAfterRender.current = pages.length;
		save([...pages, { date: todayKey(), body: "" }]);
	};

	const deletePage = async (i: number) => {
		if (pages.length < 2) return;
		const label = formatPageDate(pages[i].date);
		const confirmed = await confirmation.confirm({
			title: "Delete page",
			message: `Delete page ${i + 1} of ${pages.length}? Its text will be removed from this file. This cannot be undone.`,
			itemName: label || undefined,
			confirmText: "Delete",
			type: "danger",
		});
		if (!confirmed) return;
		save(pages.filter((_, n) => n !== i));
	};

	const mergeSameDay = async () => {
		const confirmed = await confirmation.confirm({
			title: "Merge same-day pages",
			message: `Join pages that sit next to each other and share a date? ${pages.length} pages become ${merge.pages.length}. Their text is joined in order. This cannot be undone.`,
			confirmText: "Merge",
			type: "warning",
		});
		if (!confirmed) return;
		save(merge.pages);
	};

	const viewButton = (n: DiaryView) => {
		const Icon = n === "scroll" ? ScrollText : BookOpen;
		const label = n === "scroll" ? "Scroll" : "Book";
		return (
			<Button
				key={n}
				type="button"
				onClick={() => changeView(n)}
				aria-label={`${label} view`}
				aria-pressed={view === n}
				title={n === "scroll" ? "Scroll and write" : "Read as a book"}
				className={`flex items-center px-2 py-2 rounded text-sm transition-colors ${
					view === n
						? "bg-blue-600 text-white"
						: "text-gray-300 hover:bg-gray-600"
				}`}
			>
				<Icon className="h-5 w-5" />
				<span className="ml-1.5 hidden sm:inline">{label}</span>
			</Button>
		);
	};

	const spreadButton = (n: 1 | 2) => (
		<Button
			key={n}
			type="button"
			onClick={() => changeSpread(n)}
			aria-label={n === 1 ? "Show one page" : "Show two pages"}
			aria-pressed={preferredSpread === n}
			title={n === 1 ? "One page" : "Two pages"}
			className={`px-2 py-2 rounded text-sm transition-colors ${
				preferredSpread === n
					? "bg-blue-600 text-white"
					: "text-gray-300 hover:bg-gray-600"
			}`}
		>
			{n}
		</Button>
	);

	const editing = view === "scroll" && mode === "edit";

	return (
		<>
			<div
				className={`flex-1 min-w-0 p-2 bg-white/30 dark:bg-black/30 text-gray-900 dark:text-gray-100 backdrop-blur-md shadow-sm flex-col min-h-0 ${className}`}
			>
				<div className="flex flex-wrap items-center justify-between gap-2 mb-2">
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
					{editing && merge.merged > 0 && (
						<Button
							type="button"
							onClick={mergeSameDay}
							aria-label="Merge same-day pages"
							title="Join neighbouring pages that share a date"
							className="flex items-center gap-1.5 p-2 rounded-lg bg-gray-700/50 text-sm text-gray-300 hover:bg-gray-600"
						>
							<Merge className="h-5 w-5" />
							<span className="hidden sm:inline">Merge same-day pages ({merge.merged})</span>
							<span className="sm:hidden">({merge.merged})</span>
						</Button>
					)}
					{editing && (
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
					{view === "book" && (
						<div
							role="group"
							aria-label="Pages shown"
							className={`hidden md:flex ${TOGGLE_GROUP}`}
						>
							{spreadButton(1)}
							{spreadButton(2)}
						</div>
					)}
					<div role="group" aria-label="View" className={TOGGLE_GROUP}>
						{viewButton("scroll")}
						{viewButton("book")}
					</div>
					{view === "scroll" && (
						<ModeSelector
							currentMode={mode}
							allowedModes={["preview", "edit"]}
							onModeChange={setMode}
						/>
					)}
				</div>

				{view === "scroll" ? (
					<div className="flex flex-1 min-h-0 flex-col gap-3 overflow-y-auto scrollbar-hide">
						{pages.map((page, i) => (
							<EntryCard
								key={i}
								page={page}
								index={i}
								total={pages.length}
								mode={mode}
								onEdit={handleEdit}
								onDelete={deletePage}
								registerTextarea={registerTextarea}
							/>
						))}
					</div>
				) : (
					<BookView pages={pages} spread={spread} />
				)}
			</div>
			<ConfirmationModal
				isOpen={confirmation.isOpen}
				options={confirmation.options}
				onConfirm={confirmation.handleConfirm}
				onCancel={confirmation.handleCancel}
			/>
		</>
	);
};

export default DiaryEditor;
