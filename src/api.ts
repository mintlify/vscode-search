const isDevMode = true;

// Backend API
const MINTBASE = isDevMode ? 'http://localhost:5000' : 'https://api.mintlify.com';

export const MINT_SEARCH_AUTOCOMPLETE = `${MINTBASE}/search/autocomplete`;
export const MINT_SEARCH_RESULTS = `${MINTBASE}/search/results`;
export const MINT_SEARCH_FEEDBACK = `${MINTBASE}/search/feedback`;

export const MINT_ASK_AUTOCOMPLETE = `${MINTBASE}/ask/autocomplete`;
export const MINT_ASK_ANSWER = `${MINTBASE}/ask/answer`;
export const MINT_ASK_FEEDBACK = `${MINTBASE}/ask/feedback`;

export const MINT_USER_CODE = `${MINTBASE}/user/code`;

// Authentication
const auth0URI = isDevMode ? 'https://dev-h9spuzyu.us.auth0.com' : 'https://mintlify.us.auth0.com';
const responseType = 'code';
const clientId = isDevMode ? 'Rsc8PmIdW9MqtcaJqMqWpJfYWAiMuyrV' : 'MOMiBZylQGPE0nHpbvzVHAT4TgU0DtcP';
const scope = 'openid profile email offline_access';
const redirectURI = 'vscode://mintlify.search/auth';
const returnToURI = 'vscode://mintlify.search/logout';

export const LOGIN_URI = `${auth0URI}/authorize?response_type=${responseType}&client_id=${clientId}&redirect_uri=${redirectURI}&scope=${scope}`;
export const LOGOUT_URI = `${auth0URI}/v2/logout?client_id=${clientId}&returnTo=${returnToURI}`;