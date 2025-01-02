import Facebook from '@src/assets/facebook.svg';
import Instagram from '@src/assets/instagram.svg';
import X from '@src/assets/x.svg';
import Github from '@src/assets/github.svg';
import Whatsapp from '@src/assets/whatsapp.svg';

export const getIconList = () => {
	return [
		{ name: 'Instagram', src: Instagram },
		{ name: 'Facebook', src: Facebook },
		{ name: 'X/twitter', src: X },
		{ name: 'Github', src: Github },
		{ name: 'Whatsapp', src: Whatsapp },
	];
};
