const assert = require('node:assert/strict');
const { join } = require('node:path');
const babel = require('@babel/core');

const plugin = require('../../../src');

const APP_FILE = join(process.cwd(), 'app', 'controllers', 'greeting.js');
const ADDON_FILE = join(process.cwd(), 'node_modules', 'ember-intl', 'services', 'intl.js');

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

describe('babel-plugin: what is not ours to rewrite', function () {
	it("leaves ember-intl's own formatMessage(descriptor, values) alone", function () {
		assert.equal(
			transform(`this.intl.formatMessage(descriptor, values);`),
			`this.intl.formatMessage(descriptor, values);`,
		);
	});

	it('leaves an object that is not a message descriptor alone', function () {
		assert.match(transform(`this.intl.formatMessage({ locale: 'en-us' });`), /this\.intl\.formatMessage\(/);
	});

	it('leaves library code alone', function () {
		const source = `this.intl.formatMessage({ defaultMessage: 'Hello world' });`;

		assert.match(transform(source, ADDON_FILE), /this\.intl\.formatMessage\(/);
	});

	it('leaves a format-message import in library code alone', function () {
		const source = `import FormatMessage from 'ember-intl/helpers/format-message';\nFormatMessage;`;

		assert.match(transform(source, ADDON_FILE), /'ember-intl\/helpers\/format-message'/);
	});

	it('still rewrites the format-message import in app code', function () {
		const source = `import formatMessage from 'ember-intl/helpers/format-message';\nformatMessage;`;

		assert.match(transform(source), /"ember-intl\/helpers\/t"/);
	});

	it('still rewrites an old-Embroider app staged under node_modules', function () {
		const staged = join(process.cwd(), 'node_modules', '.embroider', 'rewritten-app', 'controllers', 'greeting.js');

		assert.equal(transform(`intl.formatMessage({ defaultMessage: 'Hello world' });`, staged), `intl.t("t/eDuu");`);
	});
});
