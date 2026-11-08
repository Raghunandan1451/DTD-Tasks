import React from "react";
import { Outlet } from "react-router-dom";
import ListSelector from "@src/layout/ListSelector";
import DbStatusBanner from "@src/components/shared/db_status/DbStatusBanner";

const Layout: React.FC = () => {
	return (
		<main className="flex flex-col md:flex-row h-full md:gap-2">
			<DbStatusBanner />
			<ListSelector />
			<section className="flex flex-col w-full h-screen text-theme pt-14 md:pt-0 overflow-y-auto">
				<Outlet />
			</section>
		</main>
	);
};

export default Layout;
