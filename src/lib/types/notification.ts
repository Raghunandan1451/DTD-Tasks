export type NotifyType = "error" | "success" | "info" | undefined;

export type ShowNotificationFn = (
	message: string,
	type?: "error" | "success" | "info",
) => void;

export type InjectedNotificationProps = {
	showNotification: (message: string, type?: NotifyType) => void;
};

export interface Notification {
	id: string | number;
	message: string;
	type: NotifyType;
}

export interface NotificationHookProps {
	notifications: Notification[];
	showNotification: (message: string, type: NotifyType) => void;
}
