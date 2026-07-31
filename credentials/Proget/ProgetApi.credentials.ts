import type {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestHelper,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

import { acquireSessionToken, type ProgetCredentials } from '../../nodes/Proget/auth';

export class ProgetApi implements ICredentialType {
	name = 'progetApi';

	displayName = 'Proget API';

	icon: Icon = 'file:icons/proget.svg';

	documentationUrl = 'https://proget.pl';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			placeholder: 'https://yourtenant.proget.cloud',
			required: true,
			description: 'Base URL of your Proget instance. HTTPS is required.',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
			description:
				'Proget console user. Use a dedicated service account with the minimum required permissions.',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
		{
			displayName: 'TOTP Secret',
			name: 'totpSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Base32 seed shown when enabling two-factor authentication for the account. Used to derive the one-time codes automatically.',
		},
		{
			displayName: 'Session Token',
			name: 'sessionToken',
			type: 'hidden',
			typeOptions: { expirable: true },
			default: '',
		},
	];

	// Runs whenever the session token is missing or expired: performs the full
	// username/password + TOTP login and stores the resulting JWT.
	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
		const sessionToken = await acquireSessionToken(this, credentials as unknown as ProgetCredentials);
		return { sessionToken };
	}

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.sessionToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/mdm/device/',
			qs: { imei: '000000000000000' },
		},
	};
}
