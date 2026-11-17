import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "@src/App";
import "@src/index.css";
import { Provider } from "react-redux";
import store from "@src/lib/store/store";

// Only the desktop build includes the folder gate; the web build drops this branch.
const DesktopGate =
	import.meta.env.VITE_TARGET === "desktop"
		? lazy(() => import("@src/features/desktop/DesktopGate"))
		: null;

createRoot(document.getElementById("root")!).render(
	<Provider store={store}>
		<React.StrictMode>
			{DesktopGate ? (
				<Suspense fallback={null}>
					<DesktopGate>
						<App />
					</DesktopGate>
				</Suspense>
			) : (
				<App />
			)}
		</React.StrictMode>
	</Provider>,
);
