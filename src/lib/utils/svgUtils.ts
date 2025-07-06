import Facebook from '@src/assets/facebook.svg';
import Instagram from '@src/assets/instagram.svg';
import X from '@src/assets/x.svg';
import Github from '@src/assets/github.svg';
import Whatsapp from '@src/assets/whatsapp.svg';

interface Icon {
	name: string;
	src: string;
}
export const getIconList = (): Icon[] => {
	return [
		{ name: 'Instagram', src: Instagram },
		{ name: 'Facebook', src: Facebook },
		{ name: 'X/twitter', src: X },
		{ name: 'Github', src: Github },
		{ name: 'Whatsapp', src: Whatsapp },
	];
};
