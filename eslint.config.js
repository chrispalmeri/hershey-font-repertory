import globals from 'globals';
import pluginJs from '@eslint/js';
import stylisticJs from '@stylistic/eslint-plugin-js';

export default [
	pluginJs.configs.recommended,
	{
		languageOptions: { globals: globals.browser },
		plugins: { '@stylistic/js': stylisticJs },
		rules: {
			'@stylistic/js/indent': ['error', 'tab', { SwitchCase: 1 }]
		}
	}
];
