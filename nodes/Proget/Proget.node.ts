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
import {
	deviceApplicationFields,
	deviceApplicationOperations,
} from './descriptions/DeviceApplicationDescription';
import { deviceFields, deviceOperations } from './descriptions/DeviceDescription';
import { kioskProfileFields, kioskProfileOperations } from './descriptions/KioskProfileDescription';
import {
	assertImei,
	assertPackageName,
	assertUuid,
	progetApiRequest,
	progetApiRequestPaged,
	progetUploadApk,
} from './GenericFunctions';

const DATA_URI_REGEX = /^data:(image\/[\w+.-]+);base64,([A-Za-z0-9+/=]+)$/;
const APK_CONTENT_TYPE = 'application/vnd.android.package-archive';
const ASSIGNABLE_CATALOG_ORIGINS = new Set(['shop', 'file']);

const DEFAULT_ADVANCED_SETTINGS: IDataObject = {
	installMode: 'forceAutoInstall',
	uninstallMode: 'blocked',
	installPriority: 'high',
	installWhenCharging: false,
	wifiConnectionRequirement: 'wifiNotRequired',
	notifyAfterAppConfigAssigned: false,
	clearAppDataBeforeAssigningConfiguration: false,
};

interface ProgetAssignedApplication {
	id: number;
	packageId: string;
	applicationSettings: { advancedSettings: IDataObject };
}

interface ProgetCatalogApplication {
	id: number;
	uuid: string;
	packageId: string;
	origin: string;
}

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

// Proget list endpoints wrap results as { items, total }; plain arrays are also handled.
function toListItems(response: unknown, itemIndex: number): INodeExecutionData[] {
	if (
		typeof response === 'object' &&
		response !== null &&
		Array.isArray((response as IDataObject).items)
	) {
		return toItems((response as IDataObject).items, itemIndex);
	}
	if (Array.isArray(response)) {
		return toItems(response, itemIndex);
	}
	return [];
}

export class Proget implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Proget',
		name: 'proget',
		icon: {
			light: 'file:icons/proget.svg',
			dark: 'file:icons/proget.dark.svg',
		},
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
					{
						name: 'Device Application',
						value: 'deviceApplication',
					},
					{
						name: 'Kiosk Profile',
						value: 'kioskProfile',
					},
				],
				default: 'device',
			},
			...deviceOperations,
			...deviceFields,
			...deviceApplicationOperations,
			...deviceApplicationFields,
			...applicationOperations,
			...applicationFields,
			...kioskProfileOperations,
			...kioskProfileFields,
			...activationOperations,
			...activationFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		const executors: Record<
			string,
			(this: IExecuteFunctions, operation: string, itemIndex: number) => Promise<INodeExecutionData[]>
		> = {
			device: executeDeviceOperation,
			deviceApplication: executeDeviceApplicationOperation,
			application: executeApplicationOperation,
			kioskProfile: executeKioskProfileOperation,
			activation: executeActivationOperation,
		};

		const executor = executors[resource];
		if (executor === undefined) {
			throw new NodeOperationError(this.getNode(), `Unsupported resource "${resource}"`);
		}

		for (let i = 0; i < items.length; i++) {
			try {
				returnData.push(...(await executor.call(this, operation, i)));
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
		const response = await progetApiRequest.call(this, 'GET', '/api/mdm/device', itemIndex, undefined, {
			imei,
		});
		return toListItems(response, itemIndex);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
		const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
		const devices = await progetApiRequestPaged.call(
			this,
			'/api/mdm/device',
			itemIndex,
			{},
			returnAll,
			limit,
		);
		return toItems(devices, itemIndex);
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

	if (operation === 'getGroups') {
		const response = await progetApiRequest.call(
			this,
			'GET',
			`/api/mdm/device/${deviceUuid}/group`,
			itemIndex,
		);
		return toListItems(response, itemIndex);
	}

	if (operation === 'getKioskProfile') {
		const response = (await progetApiRequest.call(
			this,
			'GET',
			`/api/mdm/device/${deviceUuid}/profile/kiosk`,
			itemIndex,
		)) as { uuid?: string } | null;

		const json: IDataObject =
			response !== null && typeof response === 'object' && typeof response.uuid === 'string'
				? { assigned: true, ...response }
				: { assigned: false };
		return [{ json, pairedItem: { item: itemIndex } }];
	}

	if (operation === 'setAlias') {
		const alias = this.getNodeParameter('alias', itemIndex) as string;
		const response = await progetApiRequest.call(
			this,
			'PATCH',
			`/api/mdm/device/${deviceUuid}/alias`,
			itemIndex,
			{ alias },
		);
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

async function executeDeviceApplicationOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const deviceUuid = assertUuid.call(
		this,
		this.getNodeParameter('deviceUuid', itemIndex) as string,
		'Device UUID',
		itemIndex,
	);

	if (operation === 'getInstalled') {
		const packageFilter = (this.getNodeParameter('packageFilter', itemIndex, '') as string).trim();
		const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
		const limit = this.getNodeParameter('limit', itemIndex, 50) as number;

		const qs: IDataObject = {};
		if (packageFilter !== '') {
			qs.packageId = assertPackageName.call(this, packageFilter, itemIndex);
		}

		const applications = await progetApiRequestPaged.call(
			this,
			`/api/mdm/device/${deviceUuid}/installed-applications`,
			itemIndex,
			qs,
			returnAll,
			limit,
		);
		return toItems(applications, itemIndex);
	}

	if (operation === 'getManaged') {
		const response = await progetApiRequest.call(
			this,
			'GET',
			`/api/mdm/device/${deviceUuid}/managed-applications`,
			itemIndex,
		);
		return toListItems(response, itemIndex);
	}

	if (operation === 'getAssigned') {
		const response = await progetApiRequest.call(
			this,
			'GET',
			`/api/mdm/device/${deviceUuid}/applications/assigned-directly-to-device`,
			itemIndex,
		);
		return toListItems(response, itemIndex);
	}

	if (operation === 'getState') {
		const response = await progetApiRequest.call(
			this,
			'GET',
			`/api/mdm/device/${deviceUuid}/state/applications`,
			itemIndex,
		);
		return toItems(response, itemIndex);
	}

	if (operation === 'getTasks') {
		const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
		const response = (await progetApiRequest.call(
			this,
			'GET',
			`/api/mdm/device/${deviceUuid}/task/application`,
			itemIndex,
			undefined,
			{ limit, offset: 0 },
		)) as { items?: IDataObject[] };
		return toItems((response?.items ?? []).slice(0, limit), itemIndex);
	}

	if (operation === 'assign') {
		const packageName = assertPackageName.call(
			this,
			this.getNodeParameter('packageName', itemIndex) as string,
			itemIndex,
		);
		const advancedSettings = this.getNodeParameter(
			'advancedSettings',
			itemIndex,
			{},
		) as IDataObject;

		const application = await searchCatalogApplication.call(this, packageName, itemIndex);
		if (application === null || !ASSIGNABLE_CATALOG_ORIGINS.has(application.origin)) {
			throw new NodeOperationError(
				this.getNode(),
				`Application "${packageName}" is not in the Proget catalog with an assignable origin (shop or file)`,
				{ itemIndex },
			);
		}

		const assigned = await getAssignedApplications.call(this, deviceUuid, itemIndex);
		const assignments = new Map<number, IDataObject>(
			assigned.map((entry) => [
				entry.id,
				{
					id: entry.id,
					applicationSettings: { advancedSettings: entry.applicationSettings.advancedSettings },
				},
			]),
		);
		assignments.set(application.id, {
			id: application.id,
			applicationSettings: {
				advancedSettings: { ...DEFAULT_ADVANCED_SETTINGS, ...advancedSettings },
			},
		});

		await putAssignedApplications.call(this, deviceUuid, [...assignments.values()], itemIndex);

		return [
			{
				json: {
					assigned: true,
					applicationId: application.id,
					packageName,
					totalAssigned: assignments.size,
				},
				pairedItem: { item: itemIndex },
			},
		];
	}

	if (operation === 'unassign') {
		const packageName = assertPackageName.call(
			this,
			this.getNodeParameter('packageName', itemIndex) as string,
			itemIndex,
		);

		const assigned = await getAssignedApplications.call(this, deviceUuid, itemIndex);
		const kept = assigned
			.filter((entry) => entry.packageId !== packageName)
			.map((entry) => ({
				id: entry.id,
				applicationSettings: { advancedSettings: entry.applicationSettings.advancedSettings },
			}));

		const removed = kept.length !== assigned.length;
		if (removed) {
			await putAssignedApplications.call(this, deviceUuid, kept, itemIndex);
		}

		return [
			{
				json: { removed, packageName, totalAssigned: kept.length },
				pairedItem: { item: itemIndex },
			},
		];
	}

	throw new NodeOperationError(
		this.getNode(),
		`Unsupported device application operation "${operation}"`,
		{ itemIndex },
	);
}

async function getAssignedApplications(
	this: IExecuteFunctions,
	deviceUuid: string,
	itemIndex: number,
): Promise<ProgetAssignedApplication[]> {
	const response = await progetApiRequest.call(
		this,
		'GET',
		`/api/mdm/device/${deviceUuid}/applications/assigned-directly-to-device`,
		itemIndex,
	);
	return Array.isArray(response) ? (response as ProgetAssignedApplication[]) : [];
}

async function putAssignedApplications(
	this: IExecuteFunctions,
	deviceUuid: string,
	applications: IDataObject[],
	itemIndex: number,
): Promise<void> {
	await progetApiRequest.call(
		this,
		'PUT',
		`/api/mdm/device/${deviceUuid}/application/assign/device`,
		itemIndex,
		{ applications },
	);
}

async function searchCatalogApplication(
	this: IExecuteFunctions,
	packageName: string,
	itemIndex: number,
): Promise<ProgetCatalogApplication | null> {
	const response = (await progetApiRequest.call(
		this,
		'GET',
		'/api/mdm/application',
		itemIndex,
		undefined,
		{ packageId: packageName },
	)) as { items?: ProgetCatalogApplication[] };

	// The ?packageId= filter is a substring match, so the exact package must be re-checked here.
	return (response?.items ?? []).find((entry) => entry.packageId === packageName) ?? null;
}

async function executeApplicationOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	if (operation === 'getMany') {
		const packageFilter = (this.getNodeParameter('packageFilter', itemIndex, '') as string).trim();
		const qs: IDataObject = {};
		if (packageFilter !== '') {
			qs.packageId = packageFilter;
		}
		const response = await progetApiRequest.call(
			this,
			'GET',
			'/api/mdm/application',
			itemIndex,
			undefined,
			qs,
		);
		return toListItems(response, itemIndex);
	}

	if (operation === 'download') {
		const applicationUuid = assertUuid.call(
			this,
			this.getNodeParameter('applicationUuid', itemIndex) as string,
			'Application UUID',
			itemIndex,
		);
		const downloadBinaryProperty = this.getNodeParameter(
			'downloadBinaryProperty',
			itemIndex,
		) as string;

		const response = (await progetApiRequest.call(
			this,
			'GET',
			`/api/mdm/application/${applicationUuid}/file`,
			itemIndex,
			undefined,
			undefined,
			{ json: false, encoding: 'arraybuffer', returnFullResponse: true },
		)) as { body: ArrayBuffer | Buffer; headers: Record<string, unknown> };

		const buffer = Buffer.isBuffer(response.body) ? response.body : Buffer.from(response.body);
		if (buffer.length === 0) {
			throw new NodeOperationError(this.getNode(), 'Proget returned an empty APK file', {
				itemIndex,
			});
		}

		const mimeType =
			typeof response.headers['content-type'] === 'string'
				? (response.headers['content-type'] as string).split(';')[0]
				: APK_CONTENT_TYPE;
		const fileName = `${applicationUuid}.apk`;

		return [
			{
				json: { uuid: applicationUuid, fileName, mimeType, size: buffer.length },
				binary: {
					[downloadBinaryProperty]: await this.helpers.prepareBinaryData(buffer, fileName, mimeType),
				},
				pairedItem: { item: itemIndex },
			},
		];
	}

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

async function executeKioskProfileOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const kioskProfileUuid = assertUuid.call(
		this,
		this.getNodeParameter('kioskProfileUuid', itemIndex) as string,
		'Kiosk Profile UUID',
		itemIndex,
	);

	if (operation === 'get') {
		const response = await progetApiRequest.call(
			this,
			'GET',
			`/api/mdm/profile/kiosk/${kioskProfileUuid}`,
			itemIndex,
		);
		return toItems(response, itemIndex);
	}

	if (operation === 'allowApp' || operation === 'disallowApp') {
		const packageName = assertPackageName.call(
			this,
			this.getNodeParameter('packageName', itemIndex) as string,
			itemIndex,
		);

		const profile = (await progetApiRequest.call(
			this,
			'GET',
			`/api/mdm/profile/kiosk/${kioskProfileUuid}`,
			itemIndex,
		)) as {
			name: string;
			configuration: { additionalApplications?: string[] } & IDataObject;
		};

		const current = Array.isArray(profile?.configuration?.additionalApplications)
			? profile.configuration.additionalApplications
			: [];
		const isAllowed = current.includes(packageName);

		const wantsAllowed = operation === 'allowApp';
		if (isAllowed === wantsAllowed) {
			return [
				{
					json: { changed: false, packageName, allowedApplications: current },
					pairedItem: { item: itemIndex },
				},
			];
		}

		const updated = wantsAllowed
			? [...current, packageName]
			: current.filter((allowedPackageName) => allowedPackageName !== packageName);

		await progetApiRequest.call(
			this,
			'PUT',
			`/api/mdm/profile/kiosk/${kioskProfileUuid}`,
			itemIndex,
			{
				name: profile.name,
				configuration: { ...profile.configuration, additionalApplications: updated },
			},
		);

		return [
			{
				json: { changed: true, packageName, allowedApplications: updated },
				pairedItem: { item: itemIndex },
			},
		];
	}

	throw new NodeOperationError(
		this.getNode(),
		`Unsupported kiosk profile operation "${operation}"`,
		{ itemIndex },
	);
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
