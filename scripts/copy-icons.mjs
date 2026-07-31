// Copies node and credential icons (svg/png) into dist, preserving paths.
import { cpSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const ICON_EXTENSIONS = new Set(['.svg', '.png']);

function copyIcons(directory) {
	for (const entry of readdirSync(join(ROOT, directory), { withFileTypes: true })) {
		const relativePath = join(directory, entry.name);
		if (entry.isDirectory()) {
			copyIcons(relativePath);
			continue;
		}
		const extension = entry.name.slice(entry.name.lastIndexOf('.'));
		if (!ICON_EXTENSIONS.has(extension.toLowerCase())) {
			continue;
		}
		const destination = join(ROOT, 'dist', relativePath);
		mkdirSync(dirname(destination), { recursive: true });
		cpSync(join(ROOT, relativePath), destination);
	}
}

copyIcons('nodes');
copyIcons('credentials');
