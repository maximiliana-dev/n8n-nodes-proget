import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
	baseDirectory: path.dirname(fileURLToPath(import.meta.url)),
});

export default [
	{
		ignores: ['**/*.js', '**/*.mjs', 'node_modules/**', 'dist/**'],
	},
	...compat.config({
		env: {
			browser: true,
			es6: true,
			node: true,
		},
		parser: '@typescript-eslint/parser',
		parserOptions: {
			project: ['./tsconfig.eslint.json'],
			sourceType: 'module',
			extraFileExtensions: ['.json'],
		},
		overrides: [
			{
				files: ['package.json'],
				plugins: ['eslint-plugin-n8n-nodes-base'],
				extends: ['plugin:n8n-nodes-base/community'],
				rules: {
					'n8n-nodes-base/community-package-json-name-still-default': 'off',
				},
			},
			{
				files: ['./credentials/**/*.ts'],
				plugins: ['eslint-plugin-n8n-nodes-base'],
				extends: ['plugin:n8n-nodes-base/credentials'],
				rules: {
					'n8n-nodes-base/cred-class-field-documentation-url-missing': 'off',
					'n8n-nodes-base/cred-class-field-documentation-url-miscased': 'off',
				},
			},
			{
				files: ['./nodes/**/*.ts'],
				excludedFiles: ['**/*.test.ts'],
				plugins: ['eslint-plugin-n8n-nodes-base'],
				extends: ['plugin:n8n-nodes-base/nodes'],
				rules: {
					'n8n-nodes-base/node-execute-block-missing-continue-on-fail': 'off',
					'n8n-nodes-base/node-resource-description-filename-against-convention': 'off',
					'n8n-nodes-base/node-param-fixed-collection-type-unsorted-items': 'off',
				},
			},
		],
	}),
];
