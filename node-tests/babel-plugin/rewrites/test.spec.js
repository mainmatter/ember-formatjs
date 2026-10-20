const assert = require('node:assert/strict');
const { join } = require('node:path');
const babel = require('@babel/core');

const plugin = require('../../../babel-plugin');

const APP_FILE = join(process.cwd(), 'app', 'controllers', 'greeting.js');

// babel-plugin-tester runs the output through prettier, which tidies away a malformed
// argument list, so these look at babel's own output.
function transform(code, filename = APP_FILE) {
	return babel.transformSync(code, {
		filename,
		configFile: false,
		babelrc: false,
		plugins: [plugin],
	}).code;
}

describe('babel-plugin: rewritten calls', function () {
	it('passes only the key when there are no values', function () {
		assert.equal(transform(`intl.formatMessage({ defaultMessage: 'Hello world' });`), `intl.t("t/eDuu");`);
	});

	it('passes the key and the values', function () {
		assert.equal(
			transform(`this.intl.formatMessage({ defaultMessage: 'Hello {name}' }, { name });`),
			`this.intl.t("QM7ITA", {\n  name\n});`,
		);
	});

	it('uses an explicit id over the generated hash', function () {
		assert.equal(
			transform(`intl.formatMessage({ id: 'my.own.key', defaultMessage: 'Hello world' });`),
			`intl.t("my.own.key");`,
		);
	});
});
