import React from "react";
import Button from "@src/components/ui/button/Button";

interface MoveFileFolderProps {
	/** Name of the item being moved, shown in the heading. */
	itemName: string;
	/** Full paths of folders the item may be moved into (root is added here). */
	folderPaths: string[];
	/** Currently highlighted destination; "" is the root. */
	destination: string;
	setDestination: (path: string) => void;
	onMove: () => void;
	onCancel: () => void;
}

const MoveFileFolder: React.FC<MoveFileFolderProps> = ({
	itemName,
	folderPaths,
	destination,
	setDestination,
	onMove,
	onCancel,
}) => {
	const options = [{ path: "", label: "/ (top level)" }].concat(
		folderPaths.map((path) => ({ path, label: path })),
	);

	return (
		<div className="fixed inset-0 flex items-center justify-center bg-black/50 dark:bg-black/60 backdrop-blur-sm z-50">
			<div className="bg-white/30 dark:bg-black/30 backdrop-blur-lg p-6 rounded-xl shadow-2xl w-72 text-center border border-white/20 dark:border-white/10">
				<p className="mb-3 text-sm text-gray-900 dark:text-white truncate">
					Move <span className="font-semibold">{itemName}</span> to
				</p>
				<ul
					role="listbox"
					aria-label="Destination folder"
					className="max-h-56 overflow-y-auto mb-4 text-left text-sm rounded-md bg-white/20 dark:bg-gray-800/30"
				>
					{options.map(({ path, label }) => (
						<li
							key={path || "__root__"}
							role="option"
							aria-selected={destination === path}
							tabIndex={0}
							onClick={() => setDestination(path)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									setDestination(path);
								}
							}}
							className={`px-3 py-1.5 cursor-pointer truncate text-gray-900 dark:text-white ${
								destination === path
									? "bg-green-500/40"
									: "hover:bg-white/30 dark:hover:bg-white/10"
							}`}
						>
							{label}
						</li>
					))}
				</ul>
				<div className="flex justify-center mt-3 gap-2">
					<Button
						onClick={onMove}
						className="w-full bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md transition-colors shadow-md"
						text="Move"
					/>
					<Button
						onClick={onCancel}
						className="w-full bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md transition-colors shadow-md"
						text="Cancel"
					/>
				</div>
			</div>
		</div>
	);
};

export default MoveFileFolder;
