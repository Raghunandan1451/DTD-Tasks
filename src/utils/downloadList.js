export const downloadList = (list, filename) => {
	const element = document.createElement("a");
	const file = new Blob([list.join("\n")], { type: 'text/plain' });
	element.href = URL.createObjectURL(file);
	element.download = filename;
	document.body.appendChild(element);
	element.click();
};
  