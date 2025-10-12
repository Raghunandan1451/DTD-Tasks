import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { FC, lazy } from "react";

import Layout from "@src/layout/Layout";
import Home from "@src/pages/Home";
const QRGenerator = lazy(() => import("@src/pages/QRGenerator"));
const FileManager = lazy(() => import("@src/pages/FileManager"));
const ExpenseTracker = lazy(() => import("@src/pages/ExpenseTracker"));
const EventTracker = lazy(() => import("@src/pages/EventTracker"));

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
