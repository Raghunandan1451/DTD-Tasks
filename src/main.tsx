import React from "react";
import { createRoot } from "react-dom/client";
import App from "@src/App";
// @ts-expect-error TypeScript does not have a declaration for CSS side-effect imports.
import "@src/index.css";
import { Provider } from "react-redux";
import store from "@src/lib/store/store";

createRoot(document.getElementById("root")!).render(
	<Provider store={store}>
		<React.StrictMode>
			<App />
		</React.StrictMode>
	</Provider>,
);
