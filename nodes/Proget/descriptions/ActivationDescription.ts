import type { INodeProperties } from 'n8n-workflow';

export const activationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['activation'],
			},
		},
		options: [
			{
				name: 'Auto-Enroll by IMEI',
				value: 'autoEnroll',
				action: 'Add an automatic enrollment by IMEI',
				description: 'Register an IMEI so the device enrolls automatically on first boot',
			},
			{
				name: 'Generate',
				value: 'generate',
				action: 'Generate a manual activation',
				description: 'Create a manual activation with QR code and PIN',
			},
		],
		default: 'generate',
	},
];

export const activationFields: INodeProperties[] = [
	{
		displayName: 'Activation Template UUID',
		name: 'activationTemplateId',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 1af0e376-92b2-4717-b645-5966699c7d82',
		description: 'UUID of the Proget activation template to use',
		displayOptions: {
			show: {
				resource: ['activation'],
				operation: ['generate', 'autoEnroll'],
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
		description: 'IMEI of the device to auto-enroll',
		displayOptions: {
			show: {
				resource: ['activation'],
				operation: ['autoEnroll'],
			},
		},
	},
	{
		displayName: 'Attach QR Code as Image',
		name: 'attachQrCode',
		type: 'boolean',
		default: true,
		description:
			'Whether to decode the activation QR code and attach it as binary image data, ready to send or store',
		displayOptions: {
			show: {
				resource: ['activation'],
				operation: ['generate'],
			},
		},
	},
	{
		displayName: 'QR Code Binary Field',
		name: 'qrBinaryProperty',
		type: 'string',
		default: 'qr',
		required: true,
		hint: 'The name of the output binary field to write the QR code image to',
		displayOptions: {
			show: {
				resource: ['activation'],
				operation: ['generate'],
				attachQrCode: [true],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['activation'],
				operation: ['generate'],
			},
		},
		options: [
			{
				displayName: 'Count',
				name: 'count',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 100 },
				default: 1,
				description: 'How many activations to generate',
			},
			{
				displayName: 'Send Email',
				name: 'sendEmail',
				type: 'boolean',
				default: false,
				description: 'Whether Proget should email the activation to the assigned user',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['activation'],
				operation: ['autoEnroll'],
			},
		},
		options: [
			{
				displayName: 'Action on Activate',
				name: 'actionOnActivate',
				type: 'string',
				default: 'noAction',
				description: 'Action Proget performs when the device activates',
			},
			{
				displayName: 'Alias',
				name: 'alias',
				type: 'string',
				default: '',
				description: 'Friendly alias for the enrollment entry',
			},
			{
				displayName: 'Policy UUID',
				name: 'policy',
				type: 'string',
				default: '',
				description: 'UUID of the policy to assign on activation. Leave empty for none.',
			},
		],
	},
];
