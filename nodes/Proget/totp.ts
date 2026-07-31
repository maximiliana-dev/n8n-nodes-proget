import { createHmac } from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Decode(input: string): Buffer {
	const cleaned = input
		.replace(/=+$/, '')
		.replace(/\s/g, '')
		.toUpperCase();

	if (cleaned.length === 0) {
		throw new Error('TOTP secret is empty');
	}

	let bits = '';
	for (const char of cleaned) {
		const index = BASE32_ALPHABET.indexOf(char);
		if (index === -1) {
			throw new Error('TOTP secret is not valid base32');
		}
		bits += index.toString(2).padStart(5, '0');
	}

	const bytes: number[] = [];
	for (let bit = 0; bit + 8 <= bits.length; bit += 8) {
		bytes.push(parseInt(bits.slice(bit, bit + 8), 2));
	}

	return Buffer.from(bytes);
}

export interface TotpOptions {
	// Unix time in milliseconds; defaults to now
	timestamp?: number;
	periodSeconds?: number;
	digits?: number;
}

export function generateTotp(base32Secret: string, options: TotpOptions = {}): string {
	const { timestamp = Date.now(), periodSeconds = 30, digits = 6 } = options;

	const key = base32Decode(base32Secret);
	const counter = Buffer.alloc(8);
	counter.writeBigUInt64BE(BigInt(Math.floor(timestamp / 1000 / periodSeconds)));

	const hmac = createHmac('sha1', key).update(counter).digest();
	const offset = hmac[hmac.length - 1] & 0x0f;
	const binary =
		((hmac[offset] & 0x7f) << 24) |
		((hmac[offset + 1] & 0xff) << 16) |
		((hmac[offset + 2] & 0xff) << 8) |
		(hmac[offset + 3] & 0xff);

	return (binary % 10 ** digits).toString().padStart(digits, '0');
}
