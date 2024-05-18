import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export const uploadList = async (event, setList) => {
  const file = event.target.files[0];
  const reader = new FileReader();
  const fileType = file.type;

  if (fileType === "text/plain") {
    reader.onload = (e) => {
      const content = e.target.result;
      const items = content.split("\n").filter(item => item.trim() !== '');
      setList(items);
    };
    reader.readAsText(file);
  } else if (fileType === "application/pdf") {
    reader.onload = async (e) => {
      const typedArray = new Uint8Array(e.target.result);
      const pdf = await pdfjsLib.getDocument(typedArray).promise;
      let extractedText = '';
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        textContent.items.forEach(item => {
          extractedText += item.str + ' ';
        });
        extractedText += '\n';
      }
      const items = extractedText.split('\n').filter(item => item.trim() !== '');
      setList(items);
    };
    reader.readAsArrayBuffer(file);
  }
};
