import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { FC, lazy } from "react";

import Layout from "@src/layout/Layout";
import Home from "@src/features/home";
const QRGenerator = lazy(() => import("@src/features/qr_generator"));
const FileManager = lazy(() => import("@src/features/markdown"));
const ExpenseTracker = lazy(() => import("@src/features/finance"));
const EventTracker = lazy(() => import("@src/features/event"));

import { ThemeProvider } from "@src/lib/context/ThemeContext";
import withSuspense from "@src/lib/hoc/withSuspense";

const router = createBrowserRouter([
	{
		path: "/",
		element: <Layout />, // Layout contains Navbar and Outlet
		children: [
			{ path: "/", element: <Home /> },
			{ path: "/qrgen", element: withSuspense(QRGenerator) },
			{ path: "/markdown", element: withSuspense(FileManager) },
			{ path: "/expenses", element: withSuspense(ExpenseTracker) },
			{ path: "/events", element: withSuspense(EventTracker) },
		],
	},
]);

const App: FC = () => {
	return (
		<ThemeProvider>
			<RouterProvider router={router} />
		</ThemeProvider>
	);
};

export default App;
