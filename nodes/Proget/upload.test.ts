import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';

import { progetUploadApk } from './GenericFunctions';

const APK = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(32, 0x41)]);

function fakeExecuteContext(): { context: IExecuteFunctions; calls: IHttpRequestOptions[] } {
	const calls: IHttpRequestOptions[] = [];
	const context = {
		getNode: () => ({ name: 'Proget', type: 'proget', typeVersion: 1, position: [0, 0], parameters: {} }),
		getCredentials: async () => ({ baseUrl: 'https://tenant.proget.cloud' }),
		helpers: {
			assertBinaryData: () => ({ fileName: 'app.apk', mimeType: 'application/vnd.android.package-archive' }),
			getBinaryDataBuffer: async () => APK,
			httpRequestWithAuthentication: async (_type: string, options: IHttpRequestOptions) => {
				calls.push(options);
				return options.method === 'POST' ? { uuid: 'file-uuid' } : { items: [], total: 0 };
			},
		},
	} as unknown as IExecuteFunctions;
	return { context, calls };
}

describe('progetUploadApk', () => {
	it('refreshes the session with a small request before sending the APK', async () => {
		const { context, calls } = fakeExecuteContext();

		const fileReference = await progetUploadApk.call(context, 0, 'data');

		assert.equal(fileReference, 'file-uuid');
		assert.deepEqual(
			calls.map((call) => [call.method, call.url]),
			[
				['GET', 'https://tenant.proget.cloud/api/mdm/device'],
				['POST', 'https://tenant.proget.cloud/api/mdm/file'],
			],
		);
		assert.deepEqual(calls[0].qs, { limit: 1, offset: 0 });
		assert.equal(calls[0].body, undefined);

		const upload = calls[1];
		assert.ok(Buffer.isBuffer(upload.body));
		assert.ok((upload.body as Buffer).includes(APK));
		assert.match(String(upload.headers?.['Content-Type']), /^multipart\/form-data; boundary=/);
	});
});
