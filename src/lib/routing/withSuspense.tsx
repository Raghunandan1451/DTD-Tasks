import {
	Suspense,
	ReactNode,
	LazyExoticComponent,
	ComponentType,
	ReactElement,
} from "react";

const withSuspense = <P extends object = object>(
	Component: LazyExoticComponent<ComponentType<P>>,
	fallback: ReactNode = <div>Loading...</div>
): ReactElement => {
	return (
		<Suspense fallback={fallback}>
			<Component {...({} as P)} />
		</Suspense>
	);
};

export default withSuspense;
