import type { INodeProperties } from 'n8n-workflow';

export const deviceApplicationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['deviceApplication'],
			},
		},
		options: [
			{
				name: 'Assign',
				value: 'assign',
				action: 'Assign an application to a device',
				description:
					'Add a catalog application to the ones assigned directly to a device, keeping existing assignments',
			},
			{
				name: 'Get Assigned',
				value: 'getAssigned',
				action: 'Get the applications assigned to a device',
				description: 'List the applications assigned directly to a device',
			},
			{
				name: 'Get Installed',
				value: 'getInstalled',
				action: 'Get the applications installed on a device',
				description: 'List the application inventory reported by a device',
			},
			{
				name: 'Get Managed',
				value: 'getManaged',
				action: 'Get the managed applications of a device',
				description: 'List the applications managed on a device',
			},
			{
				name: 'Get State',
				value: 'getState',
				action: 'Get the application state of a device',
				description: 'Retrieve the required vs actual application state reported by a device',
			},
			{
				name: 'Get Tasks',
				value: 'getTasks',
				action: 'Get the application tasks of a device',
				description: 'List the application task history of a device, newest first',
			},
			{
				name: 'Unassign',
				value: 'unassign',
				action: 'Unassign an application from a device',
				description:
					'Remove an application from the ones assigned directly to a device, keeping the rest',
			},
		],
		default: 'getInstalled',
	},
];

export const deviceApplicationFields: INodeProperties[] = [
	{
		displayName: 'Device UUID',
		name: 'deviceUuid',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 631852b0-ed12-48a9-aeea-69a18b78486d',
		description: 'UUID of the device in Proget',
		displayOptions: {
			show: {
				resource: ['deviceApplication'],
			},
		},
	},
	{
		displayName: 'Package Name',
		name: 'packageName',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. com.example.app',
		description:
			'Android package name of the application. For Assign, it must exist in the Proget catalog (shop or file origin).',
		displayOptions: {
			show: {
				resource: ['deviceApplication'],
				operation: ['assign', 'unassign'],
			},
		},
	},
	{
		displayName: 'Package Name Filter',
		name: 'packageFilter',
		type: 'string',
		default: '',
		placeholder: 'e.g. com.example.app',
		description: 'Only return inventory entries matching this package name',
		displayOptions: {
			show: {
				resource: ['deviceApplication'],
				operation: ['getInstalled'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['deviceApplication'],
				operation: ['getInstalled'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				resource: ['deviceApplication'],
				operation: ['getInstalled'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				resource: ['deviceApplication'],
				operation: ['getTasks'],
			},
		},
	},
	{
		displayName: 'Advanced Settings',
		name: 'advancedSettings',
		type: 'collection',
		placeholder: 'Add setting',
		default: {},
		description: 'Installation settings applied to the new assignment',
		displayOptions: {
			show: {
				resource: ['deviceApplication'],
				operation: ['assign'],
			},
		},
		options: [
			{
				displayName: 'Clear App Data Before Assigning Configuration',
				name: 'clearAppDataBeforeAssigningConfiguration',
				type: 'boolean',
				default: false,
				description: 'Whether to clear the application data before assigning its configuration',
			},
			{
				displayName: 'Install Mode',
				name: 'installMode',
				type: 'string',
				default: 'forceAutoInstall',
				description: 'Proget install mode, e.g. "forceAutoInstall"',
			},
			{
				displayName: 'Install Priority',
				name: 'installPriority',
				type: 'string',
				default: 'high',
				description: 'Proget install priority, e.g. "high"',
			},
			{
				displayName: 'Install When Charging',
				name: 'installWhenCharging',
				type: 'boolean',
				default: false,
				description: 'Whether to install only while the device is charging',
			},
			{
				displayName: 'Notify After App Config Assigned',
				name: 'notifyAfterAppConfigAssigned',
				type: 'boolean',
				default: false,
				description: 'Whether to notify the user after the app configuration is assigned',
			},
			{
				displayName: 'Uninstall Mode',
				name: 'uninstallMode',
				type: 'string',
				default: 'blocked',
				description: 'Proget uninstall mode, e.g. "blocked"',
			},
			{
				displayName: 'Wi-Fi Connection Requirement',
				name: 'wifiConnectionRequirement',
				type: 'string',
				default: 'wifiNotRequired',
				description: 'Proget Wi-Fi requirement for the install, e.g. "wifiNotRequired"',
			},
		],
	},
];
