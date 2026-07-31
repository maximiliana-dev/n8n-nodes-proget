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

async function getBaseUrl(this: IExecuteFunctions): Promise<string> {
	const credentials = await this.getCredentials('progetApi');
	return normalizeProgetBaseUrl(credentials.baseUrl as string);
}

// Rethrows API failures with only safe, useful context: no request config,
// no headers, no credentials.
function toSanitizedApiError(
	this: IExecuteFunctions,
	error: unknown,
	itemIndex: number,
): NodeApiError {
	const anyError = error as {
		message?: string;
		response?: { status?: number; statusCode?: number; data?: unknown; body?: unknown };
		statusCode?: number;
	};
	const statusCode = anyError.response?.status ?? anyError.response?.statusCode ?? anyError.statusCode;
	const responseBody = anyError.response?.data ?? anyError.response?.body;

	const safeError: JsonObject = {
		message: anyError.message ?? 'Unknown error',
	};
	if (statusCode !== undefined) safeError.statusCode = statusCode;
	if (responseBody !== undefined) {
		try {
			safeError.responseBody = JSON.parse(JSON.stringify(responseBody)) as JsonObject;
		} catch {
			safeError.responseBody = String(responseBody);
		}
	}

	return new NodeApiError(this.getNode(), safeError, {
		message: statusCode !== undefined ? `Proget API request failed with status ${statusCode}` : undefined,
		httpCode: statusCode !== undefined ? String(statusCode) : undefined,
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
		if (error instanceof NodeApiError || error instanceof NodeOperationError) {
			throw error;
		}
		throw toSanitizedApiError.call(this, error, itemIndex);
	}
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
