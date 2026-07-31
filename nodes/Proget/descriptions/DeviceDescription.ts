import type { INodeProperties } from 'n8n-workflow';

export const deviceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['device'],
			},
		},
		options: [
			{
				name: 'Disable Kiosk',
				value: 'disableKiosk',
				action: 'Disable kiosk mode on a device',
				description: 'Turn off the kiosk profile on a device',
			},
			{
				name: 'Enable Kiosk',
				value: 'enableKiosk',
				action: 'Enable kiosk mode on a device',
				description: 'Turn on the kiosk profile on a device',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a device',
				description: 'Retrieve a device by its UUID',
			},
			{
				name: 'Get by IMEI',
				value: 'getByImei',
				action: 'Get a device by IMEI',
				description: 'Look up a device by its IMEI',
			},
			{
				name: 'Get Groups',
				value: 'getGroups',
				action: 'Get the groups of a device',
				description: 'List the groups a device belongs to',
			},
			{
				name: 'Get Kiosk Profile',
				value: 'getKioskProfile',
				action: 'Get the kiosk profile assigned to a device',
				description: 'Retrieve the kiosk profile currently assigned to a device',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many devices',
				description: 'List enrolled devices',
			},
			{
				name: 'Restart',
				value: 'restart',
				action: 'Restart a device',
				description: 'Reboot a device remotely',
			},
			{
				name: 'Set Alias',
				value: 'setAlias',
				action: 'Set the alias of a device',
				description: 'Change the alias shown for a device in Proget',
			},
			{
				name: 'Wipe',
				value: 'wipe',
				action: 'Wipe a device',
				description: 'Factory reset a device. This is irreversible.',
			},
		],
		default: 'get',
	},
];

export const deviceFields: INodeProperties[] = [
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
				resource: ['device'],
				operation: [
					'get',
					'restart',
					'wipe',
					'enableKiosk',
					'disableKiosk',
					'getGroups',
					'getKioskProfile',
					'setAlias',
				],
			},
		},
	},
	{
		displayName: 'IMEI',
		name: 'imei',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 351186225230012',
		description: 'IMEI of the device to look up',
		displayOptions: {
			show: {
				resource: ['device'],
				operation: ['getByImei'],
			},
		},
	},
	{
		displayName: 'Alias',
		name: 'alias',
		type: 'string',
		default: '',
		description: 'New alias for the device. Leave empty to clear it.',
		displayOptions: {
			show: {
				resource: ['device'],
				operation: ['setAlias'],
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
				resource: ['device'],
				operation: ['getMany'],
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
				resource: ['device'],
				operation: ['getMany'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'I Understand This Factory Resets the Device',
		name: 'confirmWipe',
		type: 'boolean',
		default: false,
		description:
			'Whether to confirm the wipe. The wipe erases all data on the device and cannot be undone.',
		displayOptions: {
			show: {
				resource: ['device'],
				operation: ['wipe'],
			},
		},
	},
];
