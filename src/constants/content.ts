import { platform } from 'os';

export const SIGN_IN_BUTTON = 'Sign in';
export const REQUEST_ACCESS_BUTTON = 'Request access';
export const LOGOUT_BUTTON = 'Logout';

export const ANSWER_BOX_FEEDBACK = {
	label: 'How would you rate the answer?',
	selections: {
		useful: {
			text: '👍 Useful',
			score: 1
		},
		notEnoughInfo: {
			text: '🤷 Not enough info',
			score: 0,
		},
		incorrect: {
			text: '🙅‍♂️ Incorrect',
			score: -1,
		}
	}
};

export const MINT_SEARCH_DESCRIPTION = '- Mint Search';

const isMac = platform() === 'darwin';
export const KEYBINDING = isMac ? '⌘ + M' : 'CMD + M';