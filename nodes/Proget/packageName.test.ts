import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isValidPackageName } from './packageName';

describe('isValidPackageName', () => {
	it('accepts standard Android package names', () => {
		assert.ok(isValidPackageName('com.example.app'));
		assert.ok(isValidPackageName('es.maximiliana.mos'));
		assert.ok(isValidPackageName('com.example.app_2'));
	});

	it('rejects single segments and invalid characters', () => {
		assert.ok(!isValidPackageName('app'));
		assert.ok(!isValidPackageName('com.example.'));
		assert.ok(!isValidPackageName('.com.example'));
		assert.ok(!isValidPackageName('com.1example.app'));
		assert.ok(!isValidPackageName('com.example.app; rm -rf /'));
		assert.ok(!isValidPackageName('com/example/app'));
		assert.ok(!isValidPackageName(''));
	});

	it('rejects names above 255 characters', () => {
		const long = `com.${'a'.repeat(260)}.app`;
		assert.ok(!isValidPackageName(long));
	});
});
