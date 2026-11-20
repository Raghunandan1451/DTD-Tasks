import jsPDF from "jspdf";

// Built-in helvetica only renders ASCII, so keep every string in the PDF ASCII.

export const MARGIN = 14;
export const LINE = 7;
const BOTTOM_MARGIN = 16;

export const chartColors = [
	[59, 130, 246],
	[16, 185, 129],
	[245, 158, 11],
	[239, 68, 68],
	[139, 92, 246],
	[236, 72, 153],
	[6, 182, 212],
	[132, 204, 22],
];

export const RED: [number, number, number] = [200, 40, 40];
export const GREEN: [number, number, number] = [22, 140, 90];
export const BLACK: [number, number, number] = [0, 0, 0];

export const formatMoney = (value: number): string =>
	value.toLocaleString("en-US", {
		maximumFractionDigits: 2,
		minimumFractionDigits: 2,
	});

export const signed = (value: number): string =>
	`${value < 0 ? "-" : "+"}${formatMoney(Math.abs(value))}`;

export const clip = (text: string, max: number): string =>
	text.length > max ? `${text.slice(0, max - 3)}...` : text;

export interface Layout {
	doc: jsPDF;
	pageWidth: number;
	contentWidth: number;
	/** Current vertical position; mutated as content is drawn */
	y: number;
	ensureSpace: (height: number) => void;
}

export const createLayout = (doc: jsPDF): Layout => {
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const layout: Layout = {
		doc,
		pageWidth,
		contentWidth: pageWidth - MARGIN * 2,
		y: 20,
		ensureSpace: (height) => {
			if (layout.y + height > pageHeight - BOTTOM_MARGIN) {
				doc.addPage();
				layout.y = 20;
			}
		},
	};
	return layout;
};

export const setColor = (doc: jsPDF, color: [number, number, number]) =>
	doc.setTextColor(color[0], color[1], color[2]);

/** `minContent` keeps the heading with the content below it instead of stranding it at a page bottom */
export const drawSectionHeading = (
	layout: Layout,
	text: string,
	minContent = 40,
): void => {
	const { doc } = layout;
	layout.y += 6;
	layout.ensureSpace(14 + minContent);
	doc.setFillColor(30, 41, 59);
	doc.rect(MARGIN - 2, layout.y - 6, layout.contentWidth + 4, 10, "F");
	doc.setFont("helvetica", "bold");
	doc.setFontSize(13);
	doc.setTextColor(255, 255, 255);
	doc.text(text, MARGIN + 1, layout.y + 1);
	setColor(doc, BLACK);
	layout.y += 12;
};

export const drawTitle = (layout: Layout, title: string): void => {
	const { doc, pageWidth } = layout;
	doc.setFontSize(18);
	doc.setFont("helvetica", "bold");
	doc.text(title, pageWidth / 2, layout.y, { align: "center" });
	layout.y += 8;

	doc.setFontSize(10);
	doc.setFont("helvetica", "normal");
	doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, layout.y, {
		align: "center",
	});
	layout.y += 12;
};
