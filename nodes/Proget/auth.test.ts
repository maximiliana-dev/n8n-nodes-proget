import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { IHttpRequestHelper, IHttpRequestOptions } from 'n8n-workflow';

import { acquireSessionToken, normalizeProgetBaseUrl } from './auth';

describe('normalizeProgetBaseUrl', () => {
	it('strips trailing slashes', () => {
		assert.equal(normalizeProgetBaseUrl('https://tenant.proget.cloud/'), 'https://tenant.proget.cloud');
		assert.equal(normalizeProgetBaseUrl('  https://tenant.proget.cloud//  '), 'https://tenant.proget.cloud');
	});

	it('keeps a path prefix', () => {
		assert.equal(
			normalizeProgetBaseUrl('https://mdm.example.com/proget/'),
			'https://mdm.example.com/proget',
		);
	});

	it('rejects plain HTTP', () => {
		assert.throws(() => normalizeProgetBaseUrl('http://tenant.proget.cloud'), /HTTPS/);
	});

	it('rejects embedded credentials, query strings and fragments', () => {
		assert.throws(() => normalizeProgetBaseUrl('https://user:pass@tenant.proget.cloud'), /credentials/);
		assert.throws(() => normalizeProgetBaseUrl('https://tenant.proget.cloud?a=1'), /query string/);
		assert.throws(() => normalizeProgetBaseUrl('https://tenant.proget.cloud#frag'), /query string/);
	});

	it('rejects garbage', () => {
		assert.throws(() => normalizeProgetBaseUrl('not a url'), /not a valid URL/);
	});
});

const CREDENTIALS = {
	baseUrl: 'https://tenant.proget.cloud',
	username: 'robot@example.com',
	password: 'secret',
	totpSecret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',
};

function fakeHttp(handler: (options: IHttpRequestOptions) => unknown): {
	helper: IHttpRequestHelper;
	calls: IHttpRequestOptions[];
} {
	const calls: IHttpRequestOptions[] = [];
	const helper = {
		helpers: {
			httpRequest: async (options: IHttpRequestOptions) => {
				calls.push(options);
				return handler(options);
			},
		},
	} as unknown as IHttpRequestHelper;
	return { helper, calls };
}

describe('acquireSessionToken', () => {
	it('performs the two-step login and echoes session cookies', async () => {
		const { helper, calls } = fakeHttp((options) => {
			if (options.url.endsWith('/api/mdm/login')) {
				return {
					statusCode: 401,
					body: { token: 'challenge-token' },
					headers: { 'set-cookie': ['sid=abc; Path=/; HttpOnly', 'other=1; Path=/'] },
				};
			}
			return { statusCode: 200, body: { token: 'session-jwt' }, headers: {} };
		});

		const token = await acquireSessionToken(helper, CREDENTIALS);

		assert.equal(token, 'session-jwt');
		assert.equal(calls.length, 2);
		assert.equal(calls[0].url, 'https://tenant.proget.cloud/api/mdm/login');
		assert.equal(calls[1].url, 'https://tenant.proget.cloud/api/mdm/login/2fa');
		assert.equal((calls[1].headers as Record<string, string>).Cookie, 'sid=abc; other=1');

		const twofaBody = calls[1].body as { token: string; code: string };
		assert.equal(twofaBody.token, 'challenge-token');
		assert.match(twofaBody.code, /^\d{6}$/);
	});

	it('accepts a challenge token from a 200 response', async () => {
		const { helper } = fakeHttp((options) => {
			if (options.url.endsWith('/api/mdm/login')) {
				return { statusCode: 200, body: { token: 'challenge-token' }, headers: {} };
			}
			return { statusCode: 200, body: { token: 'session-jwt' }, headers: {} };
		});

		assert.equal(await acquireSessionToken(helper, CREDENTIALS), 'session-jwt');
	});

	it('fails clearly on wrong username or password', async () => {
		const { helper } = fakeHttp(() => ({ statusCode: 401, body: {}, headers: {} }));

		await assert.rejects(
			() => acquireSessionToken(helper, CREDENTIALS),
			/login failed \(status 401\)/,
		);
	});

	it('fails clearly on a rejected TOTP code', async () => {
		const { helper } = fakeHttp((options) => {
			if (options.url.endsWith('/api/mdm/login')) {
				return { statusCode: 401, body: { token: 'challenge-token' }, headers: {} };
			}
			return { statusCode: 401, body: {}, headers: {} };
		});

		await assert.rejects(() => acquireSessionToken(helper, CREDENTIALS), /2FA failed/);
	});

	it('never leaks the password or TOTP secret in error messages', async () => {
		const { helper } = fakeHttp(() => ({ statusCode: 500, body: {}, headers: {} }));

		await assert.rejects(
			() => acquireSessionToken(helper, CREDENTIALS),
			(error: Error) => {
				assert.ok(!error.message.includes(CREDENTIALS.password));
				assert.ok(!error.message.includes(CREDENTIALS.totpSecret));
				return true;
			},
		);
	});
});
