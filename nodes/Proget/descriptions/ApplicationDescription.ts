import type { INodeProperties } from 'n8n-workflow';

export const applicationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['application'],
			},
		},
		options: [
			{
				name: 'Create From APK',
				value: 'create',
				action: 'Create an application from an APK',
				description: 'Upload an APK and register it as a new application',
			},
			{
				name: 'Update From APK',
				value: 'update',
				action: 'Update an application from an APK',
				description: 'Upload an APK and set it as the new version of an existing application',
			},
		],
		default: 'create',
	},
];

export const applicationFields: INodeProperties[] = [
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		hint: 'The name of the input binary field containing the APK file',
		displayOptions: {
			show: {
				resource: ['application'],
				operation: ['create', 'update'],
			},
		},
	},
	{
		displayName: 'Application Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		description: 'Name of the application as it will appear in Proget',
		displayOptions: {
			show: {
				resource: ['application'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		description: 'Optional description for the application',
		displayOptions: {
			show: {
				resource: ['application'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Application UUID',
		name: 'applicationUuid',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 723ff8cf-57f2-43d4-90f1-91612d01625e',
		description: 'UUID of the application to update',
		displayOptions: {
			show: {
				resource: ['application'],
				operation: ['update'],
			},
		},
	},
];
