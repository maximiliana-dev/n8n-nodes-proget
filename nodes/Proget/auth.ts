import type { IHttpRequestHelper } from 'n8n-workflow';

import { generateTotp } from './totp';

const REQUEST_TIMEOUT_MS = 30_000;

export interface ProgetCredentials {
	baseUrl: string;
	username: string;
	password: string;
	totpSecret: string;
}

export function normalizeProgetBaseUrl(raw: string): string {
	let url: URL;
	try {
		url = new URL(String(raw).trim());
	} catch {
		throw new Error('Proget base URL is not a valid URL');
	}
	if (url.protocol !== 'https:') {
		throw new Error('Proget base URL must use HTTPS');
	}
	if (url.username !== '' || url.password !== '') {
		throw new Error('Proget base URL must not contain credentials');
	}
	if (url.search !== '' || url.hash !== '') {
		throw new Error('Proget base URL must not contain a query string or fragment');
	}
	const path = url.pathname.replace(/\/+$/, '');
	return `${url.origin}${path}`;
}

interface FullResponse {
	body: { token?: unknown };
	headers: Record<string, unknown>;
	statusCode: number;
}

/**
 * Proget login is a two-step flow:
 *  1. POST /api/mdm/login with username/password. The server answers with a
 *     short-lived 2FA challenge token (carried in a 401 response) plus session cookies.
 *  2. POST /api/mdm/login/2fa with the challenge token and the current TOTP code,
 *     echoing the session cookies. The response contains the JWT session token.
 */
export async function acquireSessionToken(
	http: IHttpRequestHelper,
	credentials: ProgetCredentials,
): Promise<string> {
	const baseUrl = normalizeProgetBaseUrl(credentials.baseUrl);

	const login = (await http.helpers.httpRequest({
		method: 'POST',
		url: `${baseUrl}/api/mdm/login`,
		body: { username: credentials.username, password: credentials.password },
		json: true,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
		timeout: REQUEST_TIMEOUT_MS,
	})) as FullResponse;

	const isChallenge = login.statusCode === 200 || login.statusCode === 401;
	const challengeToken = isChallenge ? login.body?.token : undefined;
	if (typeof challengeToken !== 'string' || challengeToken === '') {
		throw new Error(
			`Proget login failed (status ${login.statusCode}): check the username and password`,
		);
	}

	const rawCookies = login.headers['set-cookie'];
	const cookieHeader = (Array.isArray(rawCookies) ? rawCookies : [])
		.map((cookie) => String(cookie).split(';')[0])
		.join('; ');

	const twofa = (await http.helpers.httpRequest({
		method: 'POST',
		url: `${baseUrl}/api/mdm/login/2fa`,
		headers: cookieHeader === '' ? {} : { Cookie: cookieHeader },
		body: {
			token: challengeToken,
			code: generateTotp(credentials.totpSecret),
		},
		json: true,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
		timeout: REQUEST_TIMEOUT_MS,
	})) as FullResponse;

	const sessionToken = twofa.statusCode === 200 ? twofa.body?.token : undefined;
	if (typeof sessionToken !== 'string' || sessionToken === '') {
		throw new Error(
			`Proget 2FA failed (status ${twofa.statusCode}): check the TOTP secret and the server clock`,
		);
	}

	return sessionToken;
}
