import BaseFinanceSetup from "@src/features/finance/base_setup/BaseFinanceSetup";
import GroupManager from "@src/features/finance/base_setup/GroupManager";
import NotificationCenter from "@src/components/ui/toast/NotificationCenter";
import useNotifications from "@src/lib/hooks/useNotifications";

export default function FinanceSetup() {
	const { notifications, showNotification } = useNotifications();

	return (
		<form className="p-6 h-full">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
				<BaseFinanceSetup showNotification={showNotification} />
				<GroupManager showNotification={showNotification} />
			</div>

			<NotificationCenter notifications={notifications} />
		</form>
	);
}
