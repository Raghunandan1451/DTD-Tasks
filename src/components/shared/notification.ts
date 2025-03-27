export interface Notification {
	id: string | number;
	message: string;
	type: 'error' | 'success' | 'info';
}
