import Button from "@src/components/ui/button/Button";
import React from "react";

const PaginationControls: React.FC<{
	currentPage: number;
	totalPages: number;
	totalItems: number;
	itemsPerPage: number;
	onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }) => {
	const getPageNumbers = () => {
		const pages = [];
		const maxVisible = 5;

		if (totalPages <= maxVisible) {
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i);
			}
		} else {
			if (currentPage <= 3) {
				for (let i = 1; i <= 4; i++) pages.push(i);
				pages.push("...");
				pages.push(totalPages);
			} else if (currentPage >= totalPages - 2) {
				pages.push(1);
				pages.push("...");
				for (let i = totalPages - 3; i <= totalPages; i++)
					pages.push(i);
			} else {
				pages.push(1);
				pages.push("...");
				for (let i = currentPage - 1; i <= currentPage + 1; i++)
					pages.push(i);
				pages.push("...");
				pages.push(totalPages);
			}
		}

		return pages;
	};

	if (totalPages <= 1) return null;

	const startItem = (currentPage - 1) * itemsPerPage + 1;
	const endItem = Math.min(currentPage * itemsPerPage, totalItems);

	return (
		<div className="flex items-center justify-between py-1 px-2 bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-xl backdrop-blur-md shadow-lg mb-4">
			<div className="flex items-center space-x-4">
				<div className="text-sm text-gray-700 dark:text-gray-300">
					Showing {startItem}-{endItem} of {totalItems} items
				</div>
				<div className="text-xs text-gray-600 dark:text-gray-400">
					Page {currentPage} of {totalPages}
				</div>
			</div>

			<div className="flex items-center space-x-1">
				<Button
					onClick={() => onPageChange(1)}
					disabled={currentPage === 1}
					className="px-2 py-1 text-sm border border-white/20 dark:border-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-200 backdrop-blur-sm"
					title="First page"
				>
					«
				</Button>

				<Button
					onClick={() => onPageChange(currentPage - 1)}
					disabled={currentPage === 1}
					className="px-2 py-1 text-sm border border-white/20 dark:border-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-200 backdrop-blur-sm"
				>
					‹
				</Button>

				{getPageNumbers().map((page, index) => (
					<Button
						key={index}
						onClick={() =>
							typeof page === "number" && onPageChange(page)
						}
						disabled={page === "..."}
						className={`px-2 py-1 text-sm border rounded-lg transition-all duration-200 backdrop-blur-sm ${
							page === currentPage
								? "bg-blue-500 text-white border-blue-500 shadow-lg"
								: page === "..."
								? "cursor-default border-white/20 dark:border-white/10 opacity-50"
								: "border-white/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-white/10"
						}`}
					>
						{page}
					</Button>
				))}

				<Button
					onClick={() => onPageChange(currentPage + 1)}
					disabled={currentPage === totalPages}
					className="px-2 py-1 text-sm border border-white/20 dark:border-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-200 backdrop-blur-sm"
				>
					›
				</Button>

				<Button
					onClick={() => onPageChange(totalPages)}
					disabled={currentPage === totalPages}
					className="px-2 py-1 text-sm border border-white/20 dark:border-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-200 backdrop-blur-sm"
					title="Last page"
				>
					»
				</Button>
			</div>
		</div>
	);
};
export default PaginationControls;
