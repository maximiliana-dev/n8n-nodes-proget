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
				name: 'Download APK',
				value: 'download',
				action: 'Download the APK of an application',
				description: 'Download the APK file of a catalog application as binary data',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many applications',
				description: 'List catalog applications, optionally filtered by package name',
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
		description: 'UUID of the application',
		displayOptions: {
			show: {
				resource: ['application'],
				operation: ['update', 'download'],
			},
		},
	},
	{
		displayName: 'Put Output File in Field',
		name: 'downloadBinaryProperty',
		type: 'string',
		default: 'data',
		required: true,
		hint: 'The name of the output binary field to put the APK file in',
		displayOptions: {
			show: {
				resource: ['application'],
				operation: ['download'],
			},
		},
	},
	{
		displayName: 'Package Name Filter',
		name: 'packageFilter',
		type: 'string',
		default: '',
		placeholder: 'e.g. com.example.app',
		description:
			'Only return catalog applications whose package name contains this value. Proget matches substrings, so check the returned "packageId" when you need an exact match.',
		displayOptions: {
			show: {
				resource: ['application'],
				operation: ['getMany'],
			},
		},
	},
];
