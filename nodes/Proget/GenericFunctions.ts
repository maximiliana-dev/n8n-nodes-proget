import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { normalizeProgetBaseUrl } from './auth';
import { buildMultipartBody, sanitizeFilename } from './multipart';
import { isValidPackageName } from './packageName';

const REQUEST_TIMEOUT_MS = 120_000;
const MAX_APK_BYTES = 500 * 1024 * 1024;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMEI_REGEX = /^\d{14,16}$/;
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

export function assertUuid(this: IExecuteFunctions, value: string, parameterName: string, itemIndex: number): string {
	const trimmed = value.trim();
	if (!UUID_REGEX.test(trimmed)) {
		throw new NodeOperationError(this.getNode(), `"${parameterName}" must be a valid UUID`, {
			itemIndex,
		});
	}
	return trimmed.toLowerCase();
}

export function assertImei(this: IExecuteFunctions, value: string, itemIndex: number): string {
	const trimmed = value.trim();
	if (!IMEI_REGEX.test(trimmed)) {
		throw new NodeOperationError(this.getNode(), 'IMEI must be a 14 to 16 digit number', {
			itemIndex,
		});
	}
	return trimmed;
}

export function assertPackageName(
	this: IExecuteFunctions,
	value: string,
	itemIndex: number,
): string {
	const trimmed = value.trim();
	if (!isValidPackageName(trimmed)) {
		throw new NodeOperationError(
			this.getNode(),
			`"${trimmed}" is not a valid Android package name`,
			{ itemIndex },
		);
	}
	return trimmed;
}

async function getBaseUrl(this: IExecuteFunctions): Promise<string> {
	const credentials = await this.getCredentials('progetApi');
	return normalizeProgetBaseUrl(credentials.baseUrl as string);
}

const ERROR_BODY_MESSAGE_KEYS = ['message', 'error', 'detail', 'details', 'title', 'errors'];
const MAX_ERROR_MESSAGE_LENGTH = 300;

// Proget does not document its error body shape, so probe the usual suspects.
export function extractProgetErrorMessage(body: unknown, depth = 0): string | undefined {
	if (depth > 3 || body === null || body === undefined) {
		return undefined;
	}
	if (typeof body === 'string') {
		const trimmed = body.trim();
		if (trimmed === '' || trimmed.startsWith('<')) {
			return undefined;
		}
		if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
			try {
				return extractProgetErrorMessage(JSON.parse(trimmed), depth + 1);
			} catch {
				// not JSON after all: use the raw string
			}
		}
		return trimmed.length > MAX_ERROR_MESSAGE_LENGTH
			? `${trimmed.slice(0, MAX_ERROR_MESSAGE_LENGTH)}…`
			: trimmed;
	}
	if (Array.isArray(body)) {
		const parts = body
			.map((entry) => extractProgetErrorMessage(entry, depth + 1))
			.filter((part): part is string => part !== undefined);
		return parts.length > 0 ? parts.join('; ') : undefined;
	}
	if (typeof body === 'object') {
		const record = body as Record<string, unknown>;
		for (const key of ERROR_BODY_MESSAGE_KEYS) {
			const message = extractProgetErrorMessage(record[key], depth + 1);
			if (message !== undefined) {
				return message;
			}
		}
	}
	return undefined;
}

// Rethrows API failures surfacing the Proget response message instead of n8n's
// generic per-status text, with only safe context: no request config, no
// headers, no credentials.
function toSanitizedApiError(
	this: IExecuteFunctions,
	error: unknown,
	itemIndex: number,
): NodeApiError {
	let statusCode: string | undefined;
	let responseBody: unknown;
	let fallbackDetail: string | undefined;
	let rawMessage: string | undefined;

	if (error instanceof NodeApiError) {
		// httpRequestWithAuthentication already wrapped the failure; recover the
		// response Proget sent and rebuild the error with its actual message.
		statusCode = error.httpCode ?? undefined;
		responseBody = error.context.data;
		fallbackDetail = error.description ?? undefined;
		rawMessage = error.message;
	} else {
		const anyError = error as {
			message?: string;
			response?: { status?: number; statusCode?: number; data?: unknown; body?: unknown };
			statusCode?: number;
		};
		const status = anyError.response?.status ?? anyError.response?.statusCode ?? anyError.statusCode;
		statusCode = status !== undefined ? String(status) : undefined;
		responseBody = anyError.response?.data ?? anyError.response?.body;
		rawMessage = anyError.message;
	}

	const detail = extractProgetErrorMessage(responseBody) ?? fallbackDetail;

	const safeError: JsonObject = {
		message: detail ?? rawMessage ?? 'Unknown error',
	};
	if (statusCode !== undefined) safeError.statusCode = statusCode;
	if (responseBody !== undefined) {
		try {
			safeError.responseBody = JSON.parse(JSON.stringify(responseBody)) as JsonObject;
		} catch {
			safeError.responseBody = String(responseBody);
		}
	}

	let message: string | undefined;
	if (detail !== undefined) {
		message = statusCode !== undefined ? `Proget error (HTTP ${statusCode}): ${detail}` : `Proget error: ${detail}`;
	} else if (statusCode !== undefined) {
		message = `Proget API request failed with status ${statusCode}`;
	}

	return new NodeApiError(this.getNode(), safeError, {
		message,
		httpCode: statusCode,
		itemIndex,
	});
}

export async function progetApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	itemIndex: number,
	body?: IDataObject,
	qs?: IDataObject,
	extraOptions?: Partial<IHttpRequestOptions>,
): Promise<unknown> {
	const baseUrl = await getBaseUrl.call(this);

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${endpoint}`,
		json: true,
		timeout: REQUEST_TIMEOUT_MS,
		...(body !== undefined ? { body } : {}),
		...(qs !== undefined ? { qs } : {}),
		...extraOptions,
	};

	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'progetApi', options);
	} catch (error) {
		if (error instanceof NodeOperationError) {
			throw error;
		}
		throw toSanitizedApiError.call(this, error, itemIndex);
	}
}

const PAGE_SIZE = 100;

/**
 * Collects items from a Proget paginated endpoint ({ items, total }), advancing the
 * offset by what each page actually returned: Proget may cap the served page size.
 */
export async function progetApiRequestPaged(
	this: IExecuteFunctions,
	endpoint: string,
	itemIndex: number,
	qs: IDataObject,
	returnAll: boolean,
	limit: number,
): Promise<IDataObject[]> {
	const max = returnAll ? Number.POSITIVE_INFINITY : limit;
	const collected: IDataObject[] = [];
	let offset = 0;
	let total = Number.POSITIVE_INFINITY;

	while (offset < total && collected.length < max) {
		const requestLimit = Math.min(PAGE_SIZE, max - collected.length);
		const response = (await progetApiRequest.call(this, 'GET', endpoint, itemIndex, undefined, {
			...qs,
			limit: requestLimit,
			offset,
		})) as { items?: IDataObject[]; total?: number };

		const page = Array.isArray(response?.items) ? response.items : [];
		if (typeof response?.total === 'number') {
			total = response.total;
		}
		if (page.length === 0) {
			break;
		}

		collected.push(...page);
		offset += page.length;
	}

	return returnAll ? collected : collected.slice(0, limit);
}

/**
 * Uploads an APK from the item's binary data to POST /api/mdm/file and returns
 * the file reference the application endpoints consume.
 */
export async function progetUploadApk(
	this: IExecuteFunctions,
	itemIndex: number,
	binaryPropertyName: string,
): Promise<string> {
	const binaryData = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);
	const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);

	if (buffer.length === 0) {
		throw new NodeOperationError(this.getNode(), 'The APK binary data is empty', { itemIndex });
	}
	if (buffer.length > MAX_APK_BYTES) {
		throw new NodeOperationError(this.getNode(), 'The APK exceeds the 500 MB upload limit', {
			itemIndex,
		});
	}
	if (!buffer.subarray(0, 4).equals(ZIP_MAGIC)) {
		throw new NodeOperationError(
			this.getNode(),
			'The binary data does not look like an APK (missing ZIP signature)',
			{ itemIndex },
		);
	}

	const filename = sanitizeFilename(binaryData.fileName ?? '', 'application.apk');
	const { body, contentType } = buildMultipartBody(
		[{ name: 'type', value: 'application' }],
		[
			{
				name: 'file',
				filename,
				contentType: 'application/vnd.android.package-archive',
				data: buffer,
			},
		],
	);

	const response = await progetApiRequest.call(this, 'POST', '/api/mdm/file', itemIndex, undefined, undefined, {
		body,
		headers: { 'Content-Type': contentType },
		json: false,
	});

	const fileReference = extractFileReference(response);
	if (fileReference === undefined) {
		throw new NodeOperationError(
			this.getNode(),
			'Proget did not return a file reference for the uploaded APK',
			{ itemIndex },
		);
	}
	return fileReference;
}

function extractFileReference(response: unknown): string | undefined {
	if (typeof response === 'string' && response.trim() !== '') {
		return response.trim();
	}
	if (typeof response === 'object' && response !== null) {
		const data = response as IDataObject;
		for (const key of ['uuid', 'id', 'file']) {
			if (typeof data[key] === 'string' && (data[key] as string) !== '') {
				return data[key] as string;
			}
		}
	}
	return undefined;
}
