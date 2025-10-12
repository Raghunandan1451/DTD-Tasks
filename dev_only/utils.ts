// export const handleDownloadPDF = (
// 	title: string,
// 	content: string,
// 	showNotification?: ShowNotificationFn
// ): void => {
// 	try {
// 		const doc = new jsPDF();
// 		doc.setFontSize(16);
// 		doc.text(title, 15, 20);
// 		doc.setFontSize(12);

// 		const lines = doc.splitTextToSize(
// 			content || "No content available.",
// 			180
// 		);
// 		doc.text(lines, 15, 35);

// 		doc.save(`${title}_${formatTimestamp()}.pdf`);
// 		showNotification?.("PDF downloaded successfully", "success");
// 	} catch (error) {
// 		console.error("PDF download error:", error);
// 		showNotification?.("Failed to download PDF", "error");
// 	}
// };
