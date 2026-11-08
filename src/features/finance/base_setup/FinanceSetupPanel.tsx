import { ChevronDown, Settings2 } from "lucide-react";
import BaseFinanceSetup from "@src/features/finance/base_setup/BaseFinanceSetup";
import GroupManager from "@src/features/finance/base_setup/GroupManager";
import RecurringCard from "@src/features/finance/base_setup/RecurringCard";
import NotificationCenter from "@src/components/ui/toast/NotificationCenter";
import useNotifications from "@src/lib/hooks/useNotifications";

const Section: React.FC<{
	title: string;
	defaultOpen?: boolean;
	children: React.ReactNode;
}> = ({ title, defaultOpen = true, children }) => (
	<details
		open={defaultOpen}
		className="group rounded-lg border bg-white/10 p-3"
	>
		<summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-gray-800 dark:text-gray-100">
			{title}
			<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
		</summary>
		<div className="mt-3">{children}</div>
	</details>
);

/**
 * Setup that sits to the right in the Overview: salary and balance,
 * groups, and recurring payments (entered once, added automatically).
 */
const FinanceSetupPanel: React.FC = () => {
	const { notifications, showNotification } = useNotifications();

	return (
		<aside
			aria-label="Setup"
			className="w-full shrink-0 space-y-3 xl:max-h-[calc(100vh-15rem)] xl:w-80 xl:overflow-y-auto scrollbar-hide"
		>
			<h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white">
				<Settings2 className="h-4 w-4" />
				Setup
			</h3>
			<Section title="Salary & balance">
				<form onSubmit={(event) => event.preventDefault()}>
					<BaseFinanceSetup showNotification={showNotification} />
				</form>
			</Section>
			<Section title="Recurring payments">
				<RecurringCard showNotification={showNotification} />
			</Section>
			<Section title="Groups" defaultOpen={false}>
				<form onSubmit={(event) => event.preventDefault()}>
					<GroupManager showNotification={showNotification} />
				</form>
			</Section>
			<NotificationCenter notifications={notifications} />
		</aside>
	);
};

export default FinanceSetupPanel;
