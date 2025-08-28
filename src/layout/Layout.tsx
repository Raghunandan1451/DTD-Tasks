import React from "react";
import { Outlet } from "react-router-dom";
import ListSelector from "@src/layout/ListSelector";

const Layout: React.FC = () => {
	return (
		<main className="flex h-full gap-2">
			<ListSelector />
			<section className="flex flex-col w-full h-screen text-theme">
				<Outlet />
			</section>
		</main>
	);
};

export default Layout;
