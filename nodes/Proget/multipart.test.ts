import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildMultipartBody, sanitizeFilename } from './multipart';

describe('sanitizeFilename', () => {
	it('keeps a plain filename', () => {
		assert.equal(sanitizeFilename('app-release.apk', 'fallback.apk'), 'app-release.apk');
	});

	it('strips directory components', () => {
		assert.equal(sanitizeFilename('../../etc/passwd', 'fallback.apk'), 'passwd');
		assert.equal(sanitizeFilename('C:\\temp\\app.apk', 'fallback.apk'), 'app.apk');
	});

	it('removes control characters and falls back when empty', () => {
		assert.equal(sanitizeFilename('\r\n\t ', 'fallback.apk'), 'fallback.apk');
		assert.equal(sanitizeFilename('a\r\nb.apk', 'fallback.apk'), 'ab.apk');
	});
});

describe('buildMultipartBody', () => {
	it('builds a parseable multipart payload', () => {
		const data = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x01]);
		const { body, contentType } = buildMultipartBody(
			[{ name: 'type', value: 'application' }],
			[
				{
					name: 'file',
					filename: 'app.apk',
					contentType: 'application/vnd.android.package-archive',
					data,
				},
			],
		);

		const boundary = contentType.split('boundary=')[1];
		assert.ok(boundary.startsWith('----n8n-proget-'));

		const text = body.toString('latin1');
		assert.ok(text.startsWith(`--${boundary}\r\n`));
		assert.ok(text.includes('Content-Disposition: form-data; name="type"\r\n\r\napplication\r\n'));
		assert.ok(
			text.includes(
				'Content-Disposition: form-data; name="file"; filename="app.apk"\r\n' +
					'Content-Type: application/vnd.android.package-archive\r\n\r\n',
			),
		);
		assert.ok(text.endsWith(`--${boundary}--\r\n`));
		assert.ok(body.includes(data));
	});

	it('generates a fresh boundary per call', () => {
		const first = buildMultipartBody([], []);
		const second = buildMultipartBody([], []);
		assert.notEqual(first.contentType, second.contentType);
	});

	it('neutralizes header injection attempts in filenames', () => {
		const { body } = buildMultipartBody(
			[],
			[
				{
					name: 'file',
					filename: 'a"\r\nX-Evil: 1\r\n.apk',
					contentType: 'application/octet-stream',
					data: Buffer.alloc(0),
				},
			],
		);
		const text = body.toString('latin1');
		assert.ok(!text.includes('X-Evil: 1\r\n'));
		assert.ok(text.includes('filename="a___X-Evil: 1__.apk"'));
	});
});
