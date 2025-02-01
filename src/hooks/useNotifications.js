import { useState } from 'react';

// Notification system instead of alerts
let notificationId = 0;
const useNotifications = () => {
	const [notifications, setNotifications] = useState([]);

	const showNotification = (message, type = 'info') => {
		const id = notificationId++;
		setNotifications((prev) => [...prev, { id, message, type }]);

		setTimeout(() => {
			setNotifications((prev) => prev.filter((n) => n.id !== id));
		}, 3000);
	};

	return { notifications, showNotification };
};

export default useNotifications;
