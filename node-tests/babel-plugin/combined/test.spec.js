const { join } = require('path');
const pluginTester = require('babel-plugin-tester').pluginTester;
const plugin = require('../../../babel-plugin');

pluginTester({
	plugin,
	snapshot: true,
	fixtures: join(__dirname, 'fixtures'),
	babelOptions: {
		plugins: ['@babel/plugin-transform-typescript'],
	},
});
