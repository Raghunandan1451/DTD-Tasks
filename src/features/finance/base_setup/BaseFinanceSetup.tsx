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
	const handleSave = () => {
		const result = validateFinanceSetup({ amount, day, balance });

		if (!result.success) {
			showNotification(result.message, "error");
			return;
		}

		dispatch(
			setSalary({ amount: parseFloat(amount), dayOfMonth: parseInt(day) })
		);
		dispatch(setCurrentBalance(parseFloat(balance)));

		showNotification(result.message, "success");
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

			<label className="font-bold text-sm">Current Balance</label>

			<Input
				id="currentBalance"
				type="number"
				placeholder="Current Balance"
				value={balance}
				onChange={(e) => setBalance(e.target.value)}
				className="number-input-noappearance"
			/>

			<Button
				type="button"
				onClick={handleSave}
				className="btn-glass-unselected p-2 rounded-lg shadow-md w-full sm:w-fit"
			>
				Save
			</Button>
		</div>
	);
};

export default BaseFinanceSetup;
