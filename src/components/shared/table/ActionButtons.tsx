import { FC } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import Button from "@src/components/ui/button/Button";

interface ActionButtonsProps {
	isEditing: boolean;
	isProtected?: boolean;
	onSave: () => void;
	onCancel: () => void;
	onEdit: () => void;
	onDelete: () => void;
}

const ActionButtons: FC<ActionButtonsProps> = ({
	isEditing,
	isProtected = false,
	onSave,
	onCancel,
	onEdit,
	onDelete,
}) => {
	return (
		<div className="flex items-center justify-center gap-1">
			{isEditing ? (
				<>
					<Button
						onClick={onSave}
						title="Save changes"
						className="p-1 hover:bg-white/10 rounded transition-colors"
					>
						<Check size={14} className="text-green-600" />
					</Button>
					<Button
						onClick={onCancel}
						title="Cancel editing"
						className="p-1 hover:bg-white/10 rounded transition-colors"
					>
						<X size={14} className="text-red-600" />
					</Button>
				</>
			) : (
				<>
					<Button
						onClick={onEdit}
						title="Edit item"
						disabled={isProtected}
						className={`p-1 rounded transition-colors ${
							isProtected
								? "opacity-50 cursor-not-allowed"
								: "hover:bg-white/10 text-blue-600"
						}`}
					>
						<Pencil size={14} />
					</Button>
					<Button
						onClick={onDelete}
						title="Delete item"
						disabled={isProtected}
						className={`p-1 rounded transition-colors ${
							isProtected
								? "opacity-50 cursor-not-allowed"
								: "hover:bg-white/10 text-red-600"
						}`}
					>
						<Trash2 size={14} />
					</Button>
				</>
			)}
		</div>
	);
};
export default ActionButtons;
