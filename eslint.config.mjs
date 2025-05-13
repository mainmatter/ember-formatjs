import js from '@eslint/js';
import globals from 'globals';

export default [
	js.configs.recommended,
	{
		files: ['**/*.js', '**/*.mjs'],
		languageOptions: {
			globals: globals.node,
		},
	},
	{
		files: ['**/*.spec.js'],
		languageOptions: {
			globals: { ...globals.node, ...globals.mocha },
		},
	},
];
