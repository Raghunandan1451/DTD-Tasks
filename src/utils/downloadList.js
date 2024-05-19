import jsPDF from 'jspdf';

const fontSize = 10;

export const downloadTodoList = (list) => {
  const doc = new jsPDF();

  doc.text('Tasks', 10, 10);
  list.forEach((item, index) => {
    const text = `${item.name} ${item.done ? '- Done' : ''}`;
    doc.setFontSize(fontSize); // Set the font size
    doc.text(text, 10, 20 + (index * (fontSize * 1.2))); // Adjust the y-coordinate based on font size
  });
  doc.save('ToDoList.pdf');
};

export const downloadShoppingList = (list) => {
  const doc = new jsPDF();
  
  doc.text('Shopping List', 10, 10);
  list.forEach((item, index) => {
    const text = `${item.name} - ${item.quantity} ${item.measure}`;
    doc.setFontSize(fontSize); // Set the font size
    doc.text(text, 10, 20 + (index * (fontSize * 1.2))); // Adjust the y-coordinate based on font size
  });
  doc.save('ShoppingList.pdf');
};
