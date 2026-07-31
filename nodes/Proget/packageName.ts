const PACKAGE_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;
const MAX_PACKAGE_NAME_LENGTH = 255;

export function isValidPackageName(value: string): boolean {
	return value.length <= MAX_PACKAGE_NAME_LENGTH && PACKAGE_NAME_REGEX.test(value);
}
