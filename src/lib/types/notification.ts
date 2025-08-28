export type InjectedNotificationProps = {
	showNotification: (
		message: string,
		type?: "error" | "success" | "info"
	) => void;
};

export interface Notification {
	id: string | number;
	message: string;
	type: "error" | "success" | "info";
}

export interface NotificationHookProps {
	notifications: Notification[];
	showNotification: (
		message: string,
		type: "error" | "success" | "info"
	) => void;
}
