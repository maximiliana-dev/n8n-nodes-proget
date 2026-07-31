import { randomBytes } from 'crypto';

export interface MultipartField {
	name: string;
	value: string;
}

export interface MultipartFile {
	name: string;
	filename: string;
	contentType: string;
	data: Buffer;
}

export interface MultipartBody {
	body: Buffer;
	contentType: string;
}

// Header values must not be able to break out of their quoted context or inject headers
function sanitizeHeaderValue(value: string): string {
	return value.replace(/[\r\n"\\]/g, '_');
}

export function sanitizeFilename(filename: string, fallback: string): string {
	const basename = filename.split(/[/\\]/).pop() ?? '';
	// eslint-disable-next-line no-control-regex
	const cleaned = basename.replace(/[\u0000-\u001f\u007f]/g, '').trim();
	return cleaned.length > 0 ? cleaned : fallback;
}

export function buildMultipartBody(fields: MultipartField[], files: MultipartFile[]): MultipartBody {
	const boundary = `----n8n-proget-${randomBytes(16).toString('hex')}`;
	const chunks: Buffer[] = [];

	for (const field of fields) {
		chunks.push(
			Buffer.from(
				`--${boundary}\r\n` +
					`Content-Disposition: form-data; name="${sanitizeHeaderValue(field.name)}"\r\n\r\n` +
					`${field.value}\r\n`,
				'utf8',
			),
		);
	}

	for (const file of files) {
		chunks.push(
			Buffer.from(
				`--${boundary}\r\n` +
					`Content-Disposition: form-data; name="${sanitizeHeaderValue(file.name)}"; ` +
					`filename="${sanitizeHeaderValue(file.filename)}"\r\n` +
					`Content-Type: ${sanitizeHeaderValue(file.contentType)}\r\n\r\n`,
				'utf8',
			),
			file.data,
			Buffer.from('\r\n', 'utf8'),
		);
	}

	chunks.push(Buffer.from(`--${boundary}--\r\n`, 'utf8'));

	return {
		body: Buffer.concat(chunks),
		contentType: `multipart/form-data; boundary=${boundary}`,
	};
}
