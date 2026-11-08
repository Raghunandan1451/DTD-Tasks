import { useMemo, useRef } from "react";
import Button from "@src/components/ui/button/Button";
import {
	parseOutline,
	serializeOutline,
	type OutlineGraph,
	type OutlineIssue,
} from "@src/features/nodes/lib/outline";

interface OutlinePanelProps {
	/** Outline text. Always shown exactly as typed, errors or not. */
	text: string;
	onTextChange: (text: string) => void;
	/** The current board, used to keep node ids stable. */
	graph: OutlineGraph;
	onApply: (graph: OutlineGraph) => void;
}

const BUTTON =
	"rounded-md px-2 py-1 text-xs text-gray-800 dark:text-gray-100 bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 disabled:opacity-40 disabled:pointer-events-none";

const Issues: React.FC<{
	issues: OutlineIssue[];
	tone: string;
	onJump: (line: number) => void;
}> = ({ issues, tone, onJump }) => (
	<ul className={`space-y-0.5 text-xs ${tone}`}>
		{issues.map((issue, index) => (
			<li key={`${issue.line}:${index}`}>
				<button type="button" className="text-left underline" onClick={() => onJump(issue.line)}>
					Line {issue.line}
				</button>
				: {issue.message}
			</li>
		))}
	</ul>
);

const OutlinePanel: React.FC<OutlinePanelProps> = ({ text, onTextChange, graph, onApply }) => {
	const areaRef = useRef<HTMLTextAreaElement>(null);
	// Only used to check the text, so the ids it generates are thrown away.
	const result = useMemo(() => parseOutline(text, graph), [text, graph]);
	const hasErrors = result.errors.length > 0;

	const jump = (line: number) => {
		const area = areaRef.current;
		if (!area) return;
		const lines = text.split(/\r?\n/);
		let start = 0;
		for (let i = 0; i < line - 1 && i < lines.length; i++) start += lines[i].length + 1;
		const end = start + (lines[line - 1]?.length ?? 0);
		area.focus();
		area.setSelectionRange(start, end);
	};

	const apply = () => {
		// Re-parse so new nodes get ids now, and so the latest board is used.
		const fresh = parseOutline(text, graph);
		if (fresh.graph) onApply(fresh.graph);
	};

	return (
		<aside
			aria-label="Outline text import and export"
			className="flex w-full shrink-0 flex-col gap-2 p-2"
		>
			<label htmlFor="outline-text" className="text-xs text-gray-700 dark:text-gray-200">
				One line per node: <code>Label -&gt; Target1, Target2</code>
			</label>
			<textarea
				id="outline-text"
				ref={areaRef}
				value={text}
				onChange={(event) => onTextChange(event.target.value)}
				spellCheck={false}
				aria-invalid={hasErrors}
				rows={10}
				className={`min-h-[8rem] w-full flex-1 resize-y rounded-md bg-black/5 p-2 font-mono text-xs text-gray-900 outline-none focus:ring-2 dark:bg-white/10 dark:text-gray-100 ${
					hasErrors ? "ring-2 ring-red-400 focus:ring-red-400" : "focus:ring-cyan-400"
				}`}
			/>
			{hasErrors && (
				<div role="alert">
					<Issues issues={result.errors} tone="text-red-600 dark:text-red-300" onJump={jump} />
					<p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
						Your text is kept. The board is unchanged until the errors are fixed.
					</p>
				</div>
			)}
			{result.warnings.length > 0 && (
				<Issues issues={result.warnings} tone="text-amber-700 dark:text-amber-300" onJump={jump} />
			)}
			<div className="flex gap-2">
				<Button className={BUTTON} onClick={apply} disabled={hasErrors} title="Apply to the board">
					Apply
				</Button>
				<Button
					className={BUTTON}
					onClick={() => {
						if (text.trim() && !window.confirm("Replace the text with the board as an outline?")) {
							return;
						}
						onTextChange(serializeOutline(graph.nodes, graph.edges));
					}}
					title="Replace this text with the board as an outline"
				>
					Load from board
				</Button>
			</div>
		</aside>
	);
};

export default OutlinePanel;
