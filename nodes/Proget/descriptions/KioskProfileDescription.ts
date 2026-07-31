import type { INodeProperties } from 'n8n-workflow';

export const kioskProfileOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['kioskProfile'],
			},
		},
		options: [
			{
				name: 'Allow App',
				value: 'allowApp',
				action: 'Allow an app in a kiosk profile',
				description:
					'Add a package to the additional applications allowed by the kiosk profile. Idempotent.',
			},
			{
				name: 'Disallow App',
				value: 'disallowApp',
				action: 'Disallow an app in a kiosk profile',
				description:
					'Remove a package from the additional applications allowed by the kiosk profile. Idempotent.',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a kiosk profile',
				description: 'Retrieve a kiosk profile by its UUID',
			},
		],
		default: 'get',
	},
];

export const kioskProfileFields: INodeProperties[] = [
	{
		displayName: 'Kiosk Profile UUID',
		name: 'kioskProfileUuid',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 8f14e45f-ce55-4b2c-8e1f-9a1b2c3d4e5f',
		description: 'UUID of the kiosk profile in Proget',
		displayOptions: {
			show: {
				resource: ['kioskProfile'],
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
		description: 'Android package name to allow or disallow in the kiosk',
		displayOptions: {
			show: {
				resource: ['kioskProfile'],
				operation: ['allowApp', 'disallowApp'],
			},
		},
	},
];
