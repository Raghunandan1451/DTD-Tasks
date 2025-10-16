import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
	setSalary,
	setCurrentBalance,
} from "@src/lib/store/slices/financeSlice";
import Input from "@src/components/ui/input/Input";
import Button from "@src/components/ui/button/Button";
import { AppDispatch, RootState } from "@src/lib/store/store";
import { validateFinanceSetup } from "@src/lib/utils/finance";
import { AlertTriangle, Lock } from "lucide-react";

interface BaseFinanceSetupProps {
	showNotification: (
		message: string,
		type: "error" | "success" | "info"
	) => void;
}

const BaseFinanceSetup = ({ showNotification }: BaseFinanceSetupProps) => {
	const { salary, currentBalance, loaded } = useSelector(
		(state: RootState) => state.finance
	);
	const dispatch = useDispatch<AppDispatch>();
	const [amount, setAmount] = useState("");
	const [day, setDay] = useState("");
	const [balance, setBalance] = useState("");

	const isBalanceAlreadySet =
		currentBalance !== null &&
		currentBalance !== undefined &&
		currentBalance !== 0;

	const handleSave = () => {
		const fieldsToValidate = isBalanceAlreadySet
			? { amount, day }
			: { amount, day, balance };

		const result = validateFinanceSetup(fieldsToValidate);

		if (!result.success) {
			showNotification(result.message, "error");
			return;
		}

		dispatch(
			setSalary({ amount: parseFloat(amount), dayOfMonth: parseInt(day) })
		);

		if (!isBalanceAlreadySet && balance) {
			dispatch(setCurrentBalance(parseFloat(balance)));
			showNotification(
				"Finance setup completed successfully! Note: Current balance can only be set once.",
				"success"
			);
		} else if (isBalanceAlreadySet) {
			showNotification(
				"Salary information updated successfully!",
				"success"
			);
		} else {
			showNotification(result.message, "success");
		}
	};

	useEffect(() => {
		if (loaded) {
			setAmount(salary?.amount?.toString() || "");
			setDay(salary?.dayOfMonth?.toString() || "");
			setBalance(currentBalance?.toString() || "");
		}
	}, [loaded, salary, currentBalance]);

	return (
		<div className="space-y-4 p-4 border rounded-xl">
			<label className="font-bold text-sm">Monthly Income</label>

			<div className="flex flex-col md:flex-row gap-4">
				<Input
					id="salaryAmount"
					type="number"
					placeholder="Salary Amount (after tax)"
					value={amount}
					onChange={(e) => setAmount(e.target.value)}
					className="md:flex-2 number-input-noappearance"
				/>
				<Input
					id="dayOfMonth"
					type="number"
					placeholder="Day of Month (1–31)"
					value={day}
					onChange={(e) => setDay(e.target.value)}
					className="md:flex-1 number-input-noappearance"
				/>
			</div>

			<label className="font-bold text-sm flex items-center gap-2">
				Current Balance
				{isBalanceAlreadySet && (
					<Lock className="w-4 h-4 text-gray-500" />
				)}
			</label>

			<div className="space-y-2">
				<Input
					id="currentBalance"
					type="number"
					placeholder="Current Balance"
					value={balance}
					onChange={(e) => setBalance(e.target.value)}
					className="number-input-noappearance"
					disabled={isBalanceAlreadySet}
				/>

				{!isBalanceAlreadySet && (
					<div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
						<AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
						<div className="text-sm text-red-800 dark:text-red-200">
							<p className="font-medium">
								Important: One-time Entry
							</p>
							<p>
								The current balance can only be set{" "}
								<strong>once</strong> and cannot be changed
								later. Please enter the correct amount
								carefully.
							</p>
						</div>
					</div>
				)}

				{isBalanceAlreadySet && (
					<div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
						<Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
						<div className="text-sm text-amber-800 dark:text-amber-200">
							<p className="font-medium">Balance Locked</p>
							<p>
								The current balance has already been set and
								cannot be modified. You can only update salary
								amount and payment day.
							</p>
						</div>
					</div>
				)}
			</div>

			<Button
				type="button"
				onClick={handleSave}
				className="btn-glass-unselected p-2 rounded-lg shadow-md w-full sm:w-fit"
			>
				{isBalanceAlreadySet ? "Update Salary Info" : "Save Setup"}
			</Button>
		</div>
	);
};

export default BaseFinanceSetup;
