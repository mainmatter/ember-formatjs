const { join } = require('path');
const pluginTester = require('babel-plugin-tester').pluginTester;
const formatMessageReplacePlugin = require('../../../src/format-message-replace-strings.cjs');

pluginTester({
	plugin: formatMessageReplacePlugin,
	snapshot: true,
	pluginOptions: {
		idInterpolationPattern: '[sha512:contenthash:base64:6]',
		preserveWhitespace: false,
	},
	pluginName: 'format message replace',
	fixtures: join(__dirname, 'fixtures'),
	babelOptions: {
		plugins: ['@babel/plugin-transform-typescript'],
	},
});
