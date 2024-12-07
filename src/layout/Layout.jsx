import { Outlet } from 'react-router-dom';
import ListSelector from '../components/ListSelector';

const Layout = () => {
	return (
		<main className="flex h-full gap-4">
			<ListSelector />
			<section className="flex flex-col w-full h-screen">
				<Outlet />
			</section>
		</main>
	);
};

export default Layout;
