const { join } = require('path');
const pluginTester = require('babel-plugin-tester').pluginTester;
const plugin = require('../../../src/index.cjs');

pluginTester({
	plugin,
	snapshot: true,
	fixtures: join(__dirname, 'fixtures'),
	babelOptions: {
		plugins: ['@babel/plugin-transform-typescript'],
	},
});
