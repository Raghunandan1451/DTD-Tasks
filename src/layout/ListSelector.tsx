import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ThemeToggle from "@src/components/shared/theme_toggler/ThemeToggle";

export interface NavItem {
	id: string; // route segment
	name: string;
	description: string;
	mobileReady?: boolean;
	group?: string; // reserved for grouping later
}

const navigationData: NavItem[] = [
	{
		id: "home",
		name: "Home",
		description: "Activity & Journal",
		mobileReady: true,
	},
	{
		id: "expenses",
		name: "Expenses",
		description: "Track spending & budgets",
		mobileReady: false,
	},
	{
		id: "qrgen",
		name: "QR Code",
		description: "Create QR codes",
		mobileReady: true,
	},
	{
		id: "markdown",
		name: "Markdown",
		description: "Write & export notes",
		mobileReady: true,
	},
];

/** "home" is the index route; every other id is its route segment. */
const toPath = (id: string): string => (id === "home" ? "/" : `/${id}`);

const DesktopOnlyBadge: React.FC = () => (
	<span className="nav-badge">Desktop only</span>
);

const ListSelector: React.FC = () => {
	const location = useLocation();
	const [isOpen, setIsOpen] = useState(false);

	const isActive = (
		currentPath: { pathname: string },
		targetPath: string,
	): boolean => {
		return currentPath.pathname === targetPath;
	};

	const toggleMenu = () => setIsOpen(!isOpen);
	const closeMenu = () => setIsOpen(false);

	return (
		<>
			{/* Mobile Header - Minimal */}
			<div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
				<div className="flex justify-between items-center px-4 py-3">
					{/* Hamburger Button */}
					<button
						onClick={toggleMenu}
						className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
						aria-label="Toggle menu"
					>
						<svg
							className="w-6 h-6 text-gray-800 dark:text-gray-200"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							{isOpen ? (
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							) : (
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M4 6h16M4 12h16M4 18h16"
								/>
							)}
						</svg>
					</button>

					{/* Logo/Brand */}
					<h1 className="text-lg font-bold text-gray-800 dark:text-gray-200">
						DTD Tasks
					</h1>

					{/* Theme Toggle */}
					<ThemeToggle />
				</div>
			</div>

			{/* Mobile Overlay */}
			{isOpen && (
				<div
					className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
					onClick={closeMenu}
				/>
			)}

			{/* Mobile Slide-out Menu */}
			<nav
				className={`md:hidden fixed top-0 left-0 bottom-0 w-64 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out ${
					isOpen ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				<div className="flex flex-col h-full">
					{/* Logo/Brand */}
					<div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700">
						<h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
							DTD Tasks
						</h2>
						<button
							onClick={closeMenu}
							className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
						>
							<svg
								className="w-5 h-5 text-gray-600 dark:text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>

					{/* Navigation Links */}
					<div className="flex-1 overflow-y-auto py-4 px-2">
						{navigationData.map(
							({ id, name, description, mobileReady }) => (
								<Link
									key={id}
									to={toPath(id)}
									onClick={closeMenu}
									className={`flex flex-col gap-1 px-3 py-3 rounded-lg text-sm transition-colors mb-2 ${
										isActive(location, toPath(id))
											? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400"
											: "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
									}`}
								>
									<span className="flex items-center gap-2 font-semibold">
										{name}
										{mobileReady === false && (
											<DesktopOnlyBadge />
										)}
									</span>
									<span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
										{description}
									</span>
								</Link>
							),
						)}
					</div>
				</div>
			</nav>

			{/* Desktop Navigation (existing glass-nav) */}
			<nav className="hidden md:block glass-nav scrollbar-hide">
				<div className="flex justify-between items-center px-2 mb-4">
					<h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
						DTD Tasks
					</h2>
					<ThemeToggle />
				</div>
				<div className="flex flex-col gap-1">
					{navigationData.map(({ id, name, mobileReady }) => (
						<Link
							key={id}
							to={toPath(id)}
							className={`${
								isActive(location, toPath(id)) ? "active" : ""
							} glass-link flex items-center justify-between gap-2`}
						>
							{name}
							{mobileReady === false && <DesktopOnlyBadge />}
						</Link>
					))}
				</div>
			</nav>
		</>
	);
};

export default ListSelector;
