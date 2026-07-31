import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { extractProgetErrorMessage } from './GenericFunctions';

describe('extractProgetErrorMessage', () => {
	it('extracts the message from common top-level keys', () => {
		assert.equal(extractProgetErrorMessage({ message: 'Device not found' }), 'Device not found');
		assert.equal(extractProgetErrorMessage({ error: 'Invalid IMEI' }), 'Invalid IMEI');
		assert.equal(extractProgetErrorMessage({ detail: 'Missing field "name"' }), 'Missing field "name"');
	});

	it('extracts nested and array-based messages', () => {
		assert.equal(
			extractProgetErrorMessage({ error: { message: 'Activation already exists' } }),
			'Activation already exists',
		);
		assert.equal(
			extractProgetErrorMessage({ errors: ['name is required', 'file is required'] }),
			'name is required; file is required',
		);
	});

	it('parses JSON-encoded string bodies', () => {
		assert.equal(extractProgetErrorMessage('{"message":"Bad token"}'), 'Bad token');
		assert.equal(extractProgetErrorMessage('  plain text error  '), 'plain text error');
	});

	it('ignores empty, HTML, and unusable bodies', () => {
		assert.equal(extractProgetErrorMessage(undefined), undefined);
		assert.equal(extractProgetErrorMessage(''), undefined);
		assert.equal(extractProgetErrorMessage('<html><body>500</body></html>'), undefined);
		assert.equal(extractProgetErrorMessage({ status: 400 }), undefined);
		assert.equal(extractProgetErrorMessage(42), undefined);
	});

	it('truncates very long messages', () => {
		const long = 'x'.repeat(500);
		const extracted = extractProgetErrorMessage({ message: long });
		assert.ok(extracted !== undefined);
		assert.ok(extracted.length <= 301);
		assert.ok(extracted.endsWith('…'));
	});
});
