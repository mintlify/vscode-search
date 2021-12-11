const isDevMode = process.env.NODE_ENV === 'development';

// Backend API
const MINTBASE = isDevMode ? 'http://localhost:5000' : 'https://api.mintlify.com';

export const MINT_SEARCH_AUTOCOMPLETE = `${MINTBASE}/search/autocomplete`;
export const MINT_SEARCH_RESULTS = `${MINTBASE}/search/results`;
export const MINT_SEARCH_FEEDBACK = `${MINTBASE}/search/feedback`;
export const MINT_SEARCH_ANSWER_BOX_FEEDBACK = `${MINTBASE}/search/feedback/answerbox`;
export const MINT_SEARCH_HISTORY = `${MINTBASE}/search/history`;

export const MINT_USER_CODE = `${MINTBASE}/user/code`;

// Authentication
const auth0URI = isDevMode ? 'https://dev-h9spuzyu.us.auth0.com' : 'https://mintlify.us.auth0.com';
const responseType = 'code';
const clientId = isDevMode ? 'Rsc8PmIdW9MqtcaJqMqWpJfYWAiMuyrV' : 'MOMiBZylQGPE0nHpbvzVHAT4TgU0DtcP';
const scope = 'openid profile email offline_access';

export const getLoginURI = (uriScheme: string) => {
  const redirectURI = `${uriScheme}://mintlify.search/auth`;
  return `${auth0URI}/authorize?response_type=${responseType}&client_id=${clientId}&redirect_uri=${redirectURI}&scope=${scope}`;
};

export const getLogoutURI = (uriScheme: string) => {
  const returnToURI = `${uriScheme}://mintlify.search/logout`;
  return `${auth0URI}/v2/logout?client_id=${clientId}&returnTo=${returnToURI}`;
};

export const REQUEST_ACCESS_URI = 'https://mintlify.com/start-minting';