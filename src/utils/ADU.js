export const addTodo = (items, newItem, setItems) => {
	if (newItem.name.trim() !== '') {
		setItems([...items, newItem]);
	}
};
    
export const deleteItem = (items, index, setItems) => {
	const updatedItems = items.filter(item => item.id !== index);
	setItems(updatedItems);
};

export const updateTodo = (items, updatedItem, setItems) => {
	const updatedItems = items.map(item =>
		item.id === updatedItem.id ? updatedItem : item
	);
	setItems(updatedItems);
};

const validMeasures = ['pkt', 'kg', 'pc', 'l', 'ml', 'g'];

export const addShoppingItem = (items, newItem, setItems) => {
	if (newItem.name.trim() !== '' && newItem.quantity > 0 && validMeasures.includes(newItem.measure)) {
		setItems([...items, newItem]);
	}
};
  
export const updateShoppingItem = (items, updatedItem, setItems) => {
	const updatedItems = items.map((item) => {
		if (item.id === updatedItem.id) {
			return { ...item, ...updatedItem };
		}
		return item;
	});
	
	setItems(updatedItems);
  };
  