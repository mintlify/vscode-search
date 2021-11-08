const auth0URI = 'https://dev-h9spuzyu.us.auth0.com';
const responseType = 'code';
const clientId = 'Rsc8PmIdW9MqtcaJqMqWpJfYWAiMuyrV';
const scope = 'openid profile email offline_access';
const redirectURI = 'vscode://mintlify.search/auth';

export const LOGIN_URI = `${auth0URI}/authorize?response_type=${responseType}&client_id=${clientId}&redirect_uri=${redirectURI}&scope=${scope}`;