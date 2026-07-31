import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { activationFields, activationOperations } from './descriptions/ActivationDescription';
import { applicationFields, applicationOperations } from './descriptions/ApplicationDescription';
import { deviceFields, deviceOperations } from './descriptions/DeviceDescription';
import { assertImei, assertUuid, progetApiRequest, progetUploadApk } from './GenericFunctions';

const DATA_URI_REGEX = /^data:(image\/[\w+.-]+);base64,([A-Za-z0-9+/=]+)$/;

function toJsonObject(response: unknown): IDataObject {
	if (typeof response === 'object' && response !== null && !Array.isArray(response)) {
		return response as IDataObject;
	}
	if (response === undefined || response === null || response === '') {
		return { success: true };
	}
	return { result: response };
}

function toItems(response: unknown, itemIndex: number): INodeExecutionData[] {
	const pairedItem = { item: itemIndex };
	if (Array.isArray(response)) {
		return response.map((entry) => ({ json: toJsonObject(entry), pairedItem }));
	}
	return [{ json: toJsonObject(response), pairedItem }];
}

export class Proget implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Proget',
		name: 'proget',
		icon: 'file:icons/proget.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Manage devices, applications and activations in the Proget MDM',
		defaults: {
			name: 'Proget',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'progetApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Activation',
						value: 'activation',
					},
					{
						name: 'Application',
						value: 'application',
					},
					{
						name: 'Device',
						value: 'device',
					},
				],
				default: 'device',
			},
			...deviceOperations,
			...deviceFields,
			...applicationOperations,
			...applicationFields,
			...activationOperations,
			...activationFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'device') {
					returnData.push(...(await executeDeviceOperation.call(this, operation, i)));
				} else if (resource === 'application') {
					returnData.push(...(await executeApplicationOperation.call(this, operation, i)));
				} else if (resource === 'activation') {
					returnData.push(...(await executeActivationOperation.call(this, operation, i)));
				} else {
					throw new NodeOperationError(this.getNode(), `Unsupported resource "${resource}"`, {
						itemIndex: i,
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error instanceof Error ? error.message : String(error) },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}

async function executeDeviceOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	if (operation === 'getByImei') {
		const imei = assertImei.call(this, this.getNodeParameter('imei', itemIndex) as string, itemIndex);
		const response = await progetApiRequest.call(this, 'GET', '/api/mdm/device/', itemIndex, undefined, {
			imei,
		});
		return toItems(response, itemIndex);
	}

	const deviceUuid = assertUuid.call(
		this,
		this.getNodeParameter('deviceUuid', itemIndex) as string,
		'Device UUID',
		itemIndex,
	);

	if (operation === 'get') {
		const response = await progetApiRequest.call(this, 'GET', `/api/mdm/device/${deviceUuid}`, itemIndex);
		return toItems(response, itemIndex);
	}

	if (operation === 'wipe') {
		const confirmed = this.getNodeParameter('confirmWipe', itemIndex) as boolean;
		if (!confirmed) {
			throw new NodeOperationError(
				this.getNode(),
				'Wipe not confirmed: enable "I Understand This Factory Resets the Device" to proceed',
				{ itemIndex },
			);
		}
		const response = await progetApiRequest.call(
			this,
			'POST',
			`/api/mdm/device/${deviceUuid}/wipe`,
			itemIndex,
		);
		return toItems(response, itemIndex);
	}

	const endpointByOperation: Record<string, string> = {
		restart: `/api/mdm/device/${deviceUuid}/restart`,
		enableKiosk: `/api/mdm/device/${deviceUuid}/profile/kiosk/enable`,
		disableKiosk: `/api/mdm/device/${deviceUuid}/profile/kiosk/disable`,
	};
	const endpoint = endpointByOperation[operation];
	if (endpoint === undefined) {
		throw new NodeOperationError(this.getNode(), `Unsupported device operation "${operation}"`, {
			itemIndex,
		});
	}

	const response = await progetApiRequest.call(this, 'POST', endpoint, itemIndex);
	return toItems(response, itemIndex);
}

async function executeApplicationOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex) as string;

	if (operation === 'create') {
		const name = (this.getNodeParameter('name', itemIndex) as string).trim();
		if (name === '') {
			throw new NodeOperationError(this.getNode(), 'Application name must not be empty', {
				itemIndex,
			});
		}
		const description = this.getNodeParameter('description', itemIndex) as string;

		const fileReference = await progetUploadApk.call(this, itemIndex, binaryPropertyName);
		const response = await progetApiRequest.call(this, 'POST', '/api/mdm/application/file', itemIndex, {
			file: fileReference,
			name,
			description,
		});
		return toItems(response, itemIndex);
	}

	if (operation === 'update') {
		const applicationUuid = assertUuid.call(
			this,
			this.getNodeParameter('applicationUuid', itemIndex) as string,
			'Application UUID',
			itemIndex,
		);

		const fileReference = await progetUploadApk.call(this, itemIndex, binaryPropertyName);
		const response = await progetApiRequest.call(
			this,
			'POST',
			`/api/mdm/application/${applicationUuid}/update/file`,
			itemIndex,
			{ file: fileReference },
		);
		return toItems(response, itemIndex);
	}

	throw new NodeOperationError(this.getNode(), `Unsupported application operation "${operation}"`, {
		itemIndex,
	});
}

async function executeActivationOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const activationTemplateId = assertUuid.call(
		this,
		this.getNodeParameter('activationTemplateId', itemIndex) as string,
		'Activation Template UUID',
		itemIndex,
	);

	if (operation === 'generate') {
		const options = this.getNodeParameter('options', itemIndex, {}) as {
			count?: number;
			sendEmail?: boolean;
		};
		const attachQrCode = this.getNodeParameter('attachQrCode', itemIndex) as boolean;

		const response = toJsonObject(
			await progetApiRequest.call(this, 'POST', '/api/mdm/activation', itemIndex, {
				activationTemplateId,
				sendEmail: options.sendEmail ?? false,
				count: options.count ?? 1,
			}),
		);

		const item: INodeExecutionData = { json: response, pairedItem: { item: itemIndex } };

		const qrMatch = typeof response.qrcode === 'string' ? DATA_URI_REGEX.exec(response.qrcode) : null;
		if (attachQrCode && qrMatch !== null) {
			const [, mimeType, base64Data] = qrMatch;
			const qrBinaryProperty = this.getNodeParameter('qrBinaryProperty', itemIndex) as string;
			const extension = mimeType.split('/')[1].replace(/[^\w]/g, '');
			item.binary = {
				[qrBinaryProperty]: await this.helpers.prepareBinaryData(
					Buffer.from(base64Data, 'base64'),
					`activation-qr.${extension}`,
					mimeType,
				),
			};
			// The raw data URI is redundant (and heavy) once the image is attached as binary
			item.json = { ...response, qrcode: undefined };
		}

		return [item];
	}

	if (operation === 'autoEnroll') {
		const imei = assertImei.call(this, this.getNodeParameter('imei', itemIndex) as string, itemIndex);
		const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as {
			actionOnActivate?: string;
			alias?: string;
			policy?: string;
		};

		const policy = additionalFields.policy?.trim();
		const response = await progetApiRequest.call(this, 'POST', '/api/mdm/auto-enroll', itemIndex, {
			type: 'imei',
			integration: 'proget',
			autoEnrollments: [
				{
					id: imei,
					activationTemplateId,
					policy:
						policy !== undefined && policy !== ''
							? assertUuid.call(this, policy, 'Policy UUID', itemIndex)
							: null,
					alias: additionalFields.alias ?? '',
					actionOnActivate: additionalFields.actionOnActivate ?? 'noAction',
				},
			],
		});
		return toItems(response, itemIndex);
	}

	throw new NodeOperationError(this.getNode(), `Unsupported activation operation "${operation}"`, {
		itemIndex,
	});
}
