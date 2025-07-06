import { useState } from "react";
import { Notification } from "@src/lib/types/notification";

interface NotificationHookProps {
	notifications: Notification[];
	showNotification: (
		message: string,
		type: "error" | "success" | "info"
	) => void;
}
// Notification system instead of alerts
let notificationId = 0;
const useNotifications = (): NotificationHookProps => {
	const [notifications, setNotifications] = useState<Notification[]>([]);

	const showNotification = (
		message: string,
		type: "error" | "success" | "info" = "info"
	) => {
		const id = notificationId++;
		setNotifications((prev) => [...prev, { id, message, type }]);

		setTimeout(() => {
			setNotifications((prev) => prev.filter((n) => n.id !== id));
		}, 5000);
	};

	return { notifications, showNotification };
};

export default useNotifications;
