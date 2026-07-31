import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { base32Decode, generateTotp } from './totp';

// RFC 6238 SHA-1 test secret: ASCII "12345678901234567890"
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('base32Decode', () => {
	it('decodes the RFC 6238 secret', () => {
		assert.equal(base32Decode(RFC_SECRET).toString('ascii'), '12345678901234567890');
	});

	it('ignores padding and whitespace, is case-insensitive', () => {
		assert.equal(base32Decode('gezd gnbv gy3t qojq gezd gnbv gy3t qojq==').toString('ascii'), '12345678901234567890');
	});

	it('rejects invalid characters', () => {
		assert.throws(() => base32Decode('not!base32'), /not valid base32/);
	});

	it('rejects empty input', () => {
		assert.throws(() => base32Decode('   '), /empty/);
	});
});

describe('generateTotp', () => {
	// RFC 6238 Appendix B vectors (SHA-1), truncated to 6 digits
	const vectors: Array<[number, string]> = [
		[59, '287082'],
		[1111111109, '081804'],
		[1111111111, '050471'],
		[1234567890, '005924'],
		[2000000000, '279037'],
		[20000000000, '353130'],
	];

	for (const [seconds, expected] of vectors) {
		it(`matches RFC 6238 vector at t=${seconds}`, () => {
			assert.equal(generateTotp(RFC_SECRET, { timestamp: seconds * 1000 }), expected);
		});
	}

	it('always returns six digits', () => {
		const code = generateTotp(RFC_SECRET);
		assert.match(code, /^\d{6}$/);
	});
});
