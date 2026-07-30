import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import tailwind from 'eslint-plugin-tailwindcss';
import globals from 'globals';

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	tailwind.configs.recommended,
	{
		settings: {
			tailwindcss: {
				cssConfigPath: 'src/app.css',
				classnames: ['class', 'className'],
				callees: ['cn'],
				entrypoint: 'src/app.css',
				cssFiles: ['src/app.css']
			}
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser
			}
		}
	},
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		}
	},
	{
		rules: {
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
			'@typescript-eslint/no-explicit-any': 'error',
			'svelte/no-navigation-without-resolve': 'off'
		}
	},
	{
		ignores: ['node_modules/', '.svelte-kit/', 'build/', 'src.bkp/']
	}
);
