// Notification component (add this to your root component)
const NotificationCenter = ({ notifications }) => (
	<div className="fixed bottom-4 right-4 space-y-2 z-50">
		{notifications.map(({ id, message, type }) => (
			<div
				key={id}
				className={`p-3 rounded-lg shadow-lg ${
					type === 'error'
						? 'bg-red-100 text-red-800'
						: type === 'success'
						? 'bg-green-100 text-green-800'
						: 'bg-blue-100 text-blue-800'
				}`}>
				{message}
			</div>
		))}
	</div>
);

export default NotificationCenter;
