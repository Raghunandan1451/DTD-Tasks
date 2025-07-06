import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@src/lib/hooks/useTheme";
import Button from "@src/components/ui/button/Button";

const ThemeToggle: React.FC = () => {
	const { theme, toggleTheme } = useTheme();
	return (
		<Button
			onClick={toggleTheme}
			className="glass-button flex items-center justify-center p-2 rounded-lg transition-all duration-300 ease-in-out cursor-pointer"
			aria-label="Toggle theme"
		>
			{theme === "light" ? (
				<Moon className="w-5 h-5 text-gray-800" />
			) : (
				<Sun className="w-5 h-5 text-gray-200" />
			)}
		</Button>
	);
};

export default ThemeToggle;
