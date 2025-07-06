import Home from "@src/pages/Home";
import QRGenerator from "@src/pages/QRGenerator";
import MarkdownEditor from "@src/pages/MarkdownEditor";

import Layout from "@src/layout/Layout";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { FC } from "react";
import { ThemeProvider } from "@src/lib/context/ThemeContext";

const router = createBrowserRouter([
	{
		path: "/",
		element: <Layout />, // Layout contains Navbar and Outlet
		children: [
			{ path: "/", element: <Home /> },
			{ path: "/qrgen", element: <QRGenerator /> },
			{ path: "/markdown", element: <MarkdownEditor /> },
		],
	},
]);

const App: FC = () => {
	return (
		<ThemeProvider>
			<RouterProvider router={router} />;
		</ThemeProvider>
	);
};

export default App;
