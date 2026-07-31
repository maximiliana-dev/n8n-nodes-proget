import base from './eslint.config.mjs';

export default [
	...base,
	{
		files: ['package.json'],
		rules: {
			'n8n-nodes-base/community-package-json-name-still-default': 'error',
		},
	},
];
