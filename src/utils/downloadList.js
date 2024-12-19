import jsPDF from 'jspdf';

// Constants
const TITLE_SIZE = 18;
const TABLE_TOP_MARGIN = 25;
const ROW_HEIGHT = 10;
const COLUMN_WIDTH = 50;
const HEADER_FONT_SIZE = 12;
const ROW_FONT_SIZE = 10;

export const handleDownloadPDF = (data, columns, title) => {
	// Filter out rows where all fields are empty
	const filteredData = data.filter((row) =>
		columns.some((col) => row[col.key]?.trim() !== '')
	);

	if (filteredData.length === 0) {
		console.warn('No non-empty rows available for PDF generation.');
		alert('No non-empty rows available to download.');
		return;
	}

	const doc = new jsPDF();

	// Draw header row with borders
	doc.setFontSize(TITLE_SIZE); // Set the font size
	doc.text(`${title} - Date: ${new Date().toLocaleDateString()}`, 14, 15);

	let yPos = TABLE_TOP_MARGIN;

	// Add headers
	doc.setFontSize(HEADER_FONT_SIZE); // Set the font size
	columns.forEach((col, index) => {
		const xPos = 14 + index * COLUMN_WIDTH;
		doc.text(col.header || col.key, xPos + 2, yPos + 6); // Add text inside the cell
		doc.rect(xPos, yPos, COLUMN_WIDTH, ROW_HEIGHT); // Draw border
	});

	// Draw data rows with borders
	yPos += ROW_HEIGHT;
	doc.setFontSize(ROW_FONT_SIZE); // Set the font size
	filteredData.forEach((row) => {
		columns.forEach((col, index) => {
			const xPos = 14 + index * COLUMN_WIDTH;
			doc.text(
				row[col.key] ? row[col.key].toString() : '',
				xPos + 2,
				yPos + 6
			); // Add text inside the cell
			doc.rect(xPos, yPos, COLUMN_WIDTH, ROW_HEIGHT); // Draw border
		});
		yPos += ROW_HEIGHT;

		// Handle page overflow
		if (yPos > 280) {
			doc.addPage();
			yPos = TABLE_TOP_MARGIN;

			// Redraw header row on new page
			columns.forEach((col, index) => {
				const xPos = 14 + index * COLUMN_WIDTH;
				doc.text(col.label || col.key, xPos + 2, yPos + 6);
				doc.rect(xPos, yPos, COLUMN_WIDTH, ROW_HEIGHT);
			});
			yPos += ROW_HEIGHT;
		}
	});

	// Save the PDF
	doc.save(`${title}.pdf`);
};
