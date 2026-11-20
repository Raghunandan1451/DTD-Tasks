import { Plus, Shapes, StickyNote, Type } from "lucide-react";
import Button from "@src/components/ui/button/Button";
import { BOARD_SHAPES, type BoardNodeType, type BoardShape } from "@src/lib/db/types";
import { SHAPE_LABEL } from "@src/features/nodes/lib/labels";
import { BTN, SELECT } from "@src/features/nodes/components/structure/structureShared";

interface AddBarProps {
	shape: BoardShape;
	canShape: boolean;
	onAdd: (type: BoardNodeType) => void;
	onShapeChange: (shape: BoardShape) => void;
}

/** Add buttons for shape, note and text, and the shape picker for new shapes. */
export const AddBar: React.FC<AddBarProps> = ({ shape, canShape, onAdd, onShapeChange }) => (
	<div className="flex flex-wrap items-center gap-1">
		<Button
			className={BTN}
			onClick={() => onAdd("shape")}
			title="Add shape"
		>
			<Plus className="h-4 w-4" />
			<Shapes className="h-4 w-4" />
			Shape
		</Button>
		<Button
			className={BTN}
			onClick={() => onAdd("note")}
			title="Add note"
		>
			<StickyNote className="h-4 w-4" />
			Note
		</Button>
		<Button
			className={BTN}
			onClick={() => onAdd("text")}
			title="Add text"
		>
			<Type className="h-4 w-4" />
			Text
		</Button>
		<div className="ml-auto flex items-center gap-1">
			<label
				className="text-xs text-gray-700 dark:text-gray-200"
				htmlFor="panel-shape"
			>
				Shape
			</label>
			<select
				id="panel-shape"
				value={shape}
				onChange={(event) =>
			onShapeChange(event.target.value as BoardShape)
		}
				className={SELECT}
				title={
					canShape
						? "Applies to selected shapes and new shapes"
						: "Used for new shapes"
				}
			>
				{BOARD_SHAPES.map((value) => (
					<option
						key={value}
						value={value}
						className="text-black"
					>
						{SHAPE_LABEL[value]}
					</option>
				))}
			</select>
		</div>
	</div>
);
