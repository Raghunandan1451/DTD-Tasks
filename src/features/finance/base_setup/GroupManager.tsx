import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addGroup, removeGroup } from "@src/lib/store/slices/financeSlice";
import { RootState } from "@src/lib/store/store";
import Input from "@src/components/ui/input/Input";
import Button from "@src/components/ui/button/Button";

const GroupManager = () => {
	const [groupName, setGroupName] = useState<string>("");
	const dispatch = useDispatch();
	const groups = useSelector((state: RootState) => state.finance.groups);

	const handleAddGroup = () => {
		if (groupName.trim()) {
			dispatch(addGroup(groupName.trim()));
			setGroupName("");
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			handleAddGroup();
		}
	};

	const handleGroupNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setGroupName(e.target.value);
	};

	return (
		<div className="space-y-6 p-6 border rounded-xl bg-white/5 backdrop-blur-sm">
			<h2 className="font-bold text-xl text-gray-800 dark:text-white">
				Manage Groups
			</h2>

			<div className="flex gap-3">
				<Input
					id="groupName"
					type="text"
					placeholder="Group name"
					value={groupName}
					onChange={handleGroupNameChange}
					onKeyDown={handleKeyDown}
					className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600"
				/>
				<Button
					type="button"
					onClick={handleAddGroup}
					className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md transition-colors"
				>
					Add
				</Button>
			</div>

			{groups.length > 0 && (
				<div>
					<h3 className="font-semibold text-sm mb-3 text-gray-700 dark:text-gray-300">
						Groups
					</h3>

					<div className="max-h-75 overflow-y-auto pr-1 scrollbar-hide">
						<ul className="space-y-2">
							{groups.map((group) => (
								<li
									key={group}
									className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 shadow-sm"
								>
									<span className="text-gray-800 dark:text-white font-medium">
										{group}
									</span>
									{group !== "Miscellaneous" && (
										<Button
											type="button"
											onClick={() =>
												dispatch(removeGroup(group))
											}
											className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
										>
											❌
										</Button>
									)}
								</li>
							))}
						</ul>
					</div>
				</div>
			)}
		</div>
	);
};

export default GroupManager;
