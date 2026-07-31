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
				name: 'Restart',
				value: 'restart',
				action: 'Restart a device',
				description: 'Reboot a device remotely',
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
				operation: ['get', 'restart', 'wipe', 'enableKiosk', 'disableKiosk'],
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
