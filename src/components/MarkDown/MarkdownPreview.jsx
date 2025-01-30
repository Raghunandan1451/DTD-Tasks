// components/MarkdownPreview.jsx
import { Fragment, createElement } from 'react';
import { useSelector } from 'react-redux';
import { parseMarkdown } from '@utils/treeUtils';

const VOID_ELEMENTS = new Set(['br', 'hr', 'img', 'input', 'link', 'meta']);

const MarkdownPreview = () => {
	const { content } = useSelector((state) => state.fileManager);

	const renderElement = (element, index) => {
		if (typeof element === 'string') return element;
		if (!element.type) return null;

		// Handle void elements specially
		const isVoidElement = VOID_ELEMENTS.has(element.type);

		// For void elements, render without children
		if (isVoidElement) {
			return createElement(element.type, {
				...element.props,
				key: element.props?.key || `void-${index}`,
			});
		}

		// Normal elements with children
		const children = element.children?.map((child, childIndex) => {
			if (Array.isArray(child)) {
				return (
					<Fragment key={`child-${index}-${childIndex}`}>
						{child.map(renderElement)}
					</Fragment>
				);
			}
			return renderElement(child, childIndex);
		});

		return createElement(
			element.type,
			{
				...element.props,
				key: element.props?.key || `element-${index}`,
				className: element.props?.className,
			},
			children
		);
	};

	const parsedElements = parseMarkdown(content || '');

	return (
		<div className="flex-1 overflow-y-auto p-2 bg-gray-700 rounded mb-4">
			{parsedElements.map((element, index) => (
				<Fragment key={element.props?.key || `fragment-${index}`}>
					{renderElement(element, index)}
				</Fragment>
			))}
		</div>
	);
};

export default MarkdownPreview;
