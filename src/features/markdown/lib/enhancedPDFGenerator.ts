// enhancedPDFGenerator.ts - Comprehensive markdown to PDF with proper encoding
import { jsPDF } from "jspdf";
import { File } from "@src/features/markdown/type";

export const generateIndividualFilePDF = (file: File): jsPDF => {
	const doc = new jsPDF({
		unit: "pt",
		format: "a4",
	});

	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const margin = 40;
	const maxWidth = pageWidth - margin * 2;
	let yPos = margin;

	doc.setFont("helvetica", "normal");
	doc.setFontSize(10);

	const checkPageBreak = (requiredSpace: number = 30): boolean => {
		if (yPos + requiredSpace > pageHeight - margin) {
			doc.addPage();
			yPos = margin;
			return true;
		}
		return false;
	};

	const addText = (
		text: string,
		x: number,
		y: number,
		firstLineOnly: boolean = false
	): number => {
		const cleanText = text
			// eslint-disable-next-line no-control-regex
			.replace(/[\x00-\x1F\x7F-\x9F]/g, "")
			.replace(/[^\x20-\x7E]/g, (char) => {
				const map: Record<string, string> = {
					"\u2018": "'",
					"\u2019": "'",
					"\u201C": '"',
					"\u201D": '"',
					"\u2014": "-",
					"\u2013": "-",
					"\u2026": "...",
				};
				return map[char] || "";
			})
			.trim();

		const lines = doc.splitTextToSize(cleanText, maxWidth - (x - margin));

		// Render lines with proper indentation control
		lines.forEach((line: string, index: number) => {
			const xPos = firstLineOnly && index > 0 ? margin : x;
			doc.text(line, xPos, y + index * 12);
		});

		return lines.length;
	};

	if (file.content && file.content.trim()) {
		const lines = file.content.split("\n");
		let inCodeBlock = false;
		let codeLines: string[] = [];

		lines.forEach((line) => {
			const trimmed = line.trim();

			// Code blocks
			if (trimmed.startsWith("```")) {
				if (inCodeBlock) {
					// End code block - render it
					checkPageBreak(codeLines.length * 12 + 20);

					doc.setFillColor(245, 245, 245);
					const blockHeight = codeLines.length * 12 + 16;
					doc.rect(margin, yPos - 8, maxWidth, blockHeight, "F");

					doc.setFont("courier", "normal");
					doc.setFontSize(9);
					doc.setTextColor(60);

					codeLines.forEach((codeLine) => {
						addText(codeLine, margin + 8, yPos);
						yPos += 12;
					});

					doc.setTextColor(0);
					doc.setFont("helvetica", "normal");
					doc.setFontSize(10);
					yPos += 12;

					codeLines = [];
					inCodeBlock = false;
				} else {
					inCodeBlock = true;
				}
				return;
			}

			if (inCodeBlock) {
				codeLines.push(line);
				return;
			}

			checkPageBreak();

			// Headers
			if (trimmed.startsWith("### ")) {
				doc.setFont("helvetica", "bold");
				doc.setFontSize(12);
				const text = trimmed.substring(4);
				const lineCount = addText(text, margin, yPos);
				yPos += lineCount * 14 + 4;
				doc.setFont("helvetica", "normal");
				doc.setFontSize(10);
			} else if (trimmed.startsWith("## ")) {
				doc.setFont("helvetica", "bold");
				doc.setFontSize(14);
				const text = trimmed.substring(3);
				const lineCount = addText(text, margin, yPos);
				yPos += lineCount * 16 + 6;
				doc.setFont("helvetica", "normal");
				doc.setFontSize(10);
			} else if (trimmed.startsWith("# ")) {
				doc.setFont("helvetica", "bold");
				doc.setFontSize(16);
				const text = trimmed.substring(2);
				const lineCount = addText(text, margin, yPos);
				yPos += lineCount * 18 + 8;
				doc.setFont("helvetica", "normal");
				doc.setFontSize(10);
			}
			// Blockquotes
			else if (trimmed.startsWith("> ")) {
				doc.setFont("helvetica", "italic");
				doc.setTextColor(100);
				const text = trimmed.substring(2);
				const lineCount = addText(text, margin + 16, yPos);
				doc.setFont("helvetica", "normal");
				doc.setTextColor(0);
				yPos += lineCount * 13;
			}
			// Lists
			else if (trimmed.match(/^[-*]\s+/)) {
				const text = trimmed.replace(/^[-*]\s+/, "");
				doc.text("•", margin + 8, yPos);
				const lineCount = addText(text, margin + 20, yPos);
				yPos += lineCount * 12;
			}
			// Indented paragraph (~>)
			else if (trimmed.startsWith("~> ")) {
				const text = trimmed.substring(3);
				const lineCount = addText(text, margin + 30, yPos, true); // Only indent first line
				yPos += lineCount * 12 + 2;
			}
			// Dialogue (Name: text)
			else if (trimmed.match(/^([A-Z][a-zA-Z\s]+):\s+(.+)$/)) {
				const match = trimmed.match(/^([A-Z][a-zA-Z\s]+):\s+(.+)$/);
				if (match) {
					doc.setFont("helvetica", "bold");
					doc.text(match[1] + ":", margin, yPos);
					doc.setFont("helvetica", "normal");
					const lineCount = addText(match[2], margin + 80, yPos);
					yPos += lineCount * 12 + 2;
				}
			} else if (trimmed) {
				const processed = trimmed
					// Handle all four combinations
					.replace(/\*\*_~~__([^_~*]+)__~~_\*\*/g, "$1")
					.replace(/\*\*__~~_([^_~*]+)_~~__\*\*/g, "$1")

					// Handle triple combinations
					// Bold + Italic + Strikethrough
					.replace(/\*\*\*~~([^~*]+)~~\*\*\*/g, "$1")
					.replace(/\*\*_~~([^~*]+)~~_\*\*/g, "$1")
					.replace(/~~\*\*\*([^*]+)\*\*\*~~/g, "$1")

					// Bold + Italic + Underline
					.replace(/\*\*\*__([^_*]+)__\*\*\*/g, "$1")
					.replace(/\*\*___([^_*]+)___\*\*/g, "$1")
					.replace(/__\*\*\*([^*]+)\*\*\*__/g, "$1")

					// Bold + Underline + Strikethrough
					.replace(/\*\*__~~([^~_*]+)~~__\*\*/g, "$1")
					.replace(/~~\*\*__([^_*]+)__\*\*~~/g, "$1")

					// Italic + Underline + Strikethrough
					.replace(/\*__~~([^~_*]+)~~__\*/g, "$1")
					.replace(/~~__\*([^*]+)\*__~~/g, "$1")

					// Handle double combinations
					// Bold + Italic
					.replace(/\*\*\*([^*]+)\*\*\*/g, "$1")
					.replace(/\*\*_([^_*]+)_\*\*/g, "$1")
					.replace(/_\*\*([^*]+)\*\*_/g, "$1")

					// Bold + Underline
					.replace(/\*\*__([^_*]+)__\*\*/g, "$1")
					.replace(/__\*\*([^*]+)\*\*__/g, "$1")

					// Bold + Strikethrough
					.replace(/\*\*~~([^~*]+)~~\*\*/g, "$1")
					.replace(/~~\*\*([^*]+)\*\*~~/g, "$1")

					// Bold + Inline Code
					.replace(/\*\*`([^`*]+)`\*\*/g, "$1")
					.replace(/`\*\*([^*]+)\*\*`/g, "$1")

					// Italic + Underline
					.replace(/\*__([^_*]+)__\*/g, "$1")
					.replace(/__\*([^*]+)\*__/g, "$1")

					// Italic + Strikethrough
					.replace(/\*~~([^~*]+)~~\*/g, "$1")
					.replace(/~~\*([^*]+)\*~~/g, "$1")

					// Italic + Inline Code
					.replace(/\*`([^`*]+)`\*/g, "$1")
					.replace(/`\*([^*]+)\*`/g, "$1")

					// Underline + Strikethrough
					.replace(/__~~([^~_]+)~~__/g, "$1")
					.replace(/~~__([^_]+)__~~/g, "$1")

					// Underline + Inline Code
					.replace(/__`([^`_]+)`__/g, "$1")
					.replace(/`__([^_]+)__`/g, "$1")

					// Strikethrough + Inline Code
					.replace(/~~`([^`~]+)`~~/g, "$1")
					.replace(/`~~([^~]+)~~`/g, "$1")

					// Single formatting (original)
					.replace(/\*\*([^*]+)\*\*/g, "$1") // Bold
					.replace(/\*([^*]+)\*/g, "$1") // Italic
					.replace(/__([^_]+)__/g, "$1") // Underline
					.replace(/~~([^~]+)~~/g, "$1") // Strikethrough
					.replace(/`([^`]+)`/g, "$1") // Inline code
					.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)"); // Links

				const lineCount = addText(processed, margin, yPos);
				yPos += lineCount * 12 + 2;
			} else {
				yPos += 6; // Empty line
			}
		});
	}

	return doc;
};
