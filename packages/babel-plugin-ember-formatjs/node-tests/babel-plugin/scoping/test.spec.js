'use strict';

const assert = require('node:assert/strict');
const { join } = require('node:path');
const babel = require('@babel/core');

const plugin = require('../../../src/index.cjs');

const APP_FILE = join(process.cwd(), 'app', 'controllers', 'greeting.js');
const ADDON_FILE = join(process.cwd(), 'node_modules', 'ember-intl', 'helpers', 'format-message.js');

function transform(code, filename = APP_FILE) {
	return babel.transformSync(code, {
		filename,
		configFile: false,
		babelrc: false,
		plugins: [plugin],
	}).code;
}

/**
 * The authoring sugar belongs to the app. Under Embroider + Vite, `ember-intl`'s own
 * sources run through the same babel pass as the app's, and `ember-intl` calls
 * `intl.formatMessage(descriptor, values)` internally. Rewriting those calls turns the
 * library's own code into `intl.t('<hash of undefined>')` and leaks the id pattern into
 * the translation keys, so the transform has to recognise what is not its own.
 */
describe('babel-plugin: what is and is not ours to rewrite', function () {
	it('rewrites the FormatJS authoring shape', function () {
		const code = transform(`this.intl.formatMessage({ defaultMessage: 'Hello world' });`);

		assert.match(code, /this\.intl\.t\("t\/eDuu"\)/);
	});

	it('rewrites a bare intl reference too', function () {
		const code = transform(`intl.formatMessage({ defaultMessage: 'Hello world' });`);

		assert.match(code, /intl\.t\("t\/eDuu"\)/);
	});

	it("leaves ember-intl's own descriptor-and-values signature alone", function () {
		const source = `this.intl.formatMessage(descriptor, values);`;

		assert.match(transform(source), /this\.intl\.formatMessage\(descriptor, values\)/);
	});

	it('leaves an object argument that is not a message descriptor alone', function () {
		const source = `this.intl.formatMessage({ locale: 'en-us' });`;

		assert.match(transform(source), /this\.intl\.formatMessage\(\{\s*locale: 'en-us'\s*\}\)/);
	});

	it('respects an explicit id over the generated hash', function () {
		const code = transform(`intl.formatMessage({ id: 'my.own.key', defaultMessage: 'Hello world' });`);

		assert.match(code, /intl\.t\("my\.own\.key"\)/);
	});

	it('leaves library code alone', function () {
		const source = `this.intl.formatMessage({ defaultMessage: 'Hello world' });`;

		assert.match(transform(source, ADDON_FILE), /this\.intl\.formatMessage\(\{\s*defaultMessage/);
	});

	it('leaves a library format-message import alone', function () {
		const source = `import formatMessage from 'ember-intl/helpers/format-message';\nformatMessage;`;

		assert.match(transform(source, ADDON_FILE), /'ember-intl\/helpers\/format-message'/);
	});

	it('rewrites the format-message import in app code', function () {
		const source = `import formatMessage from 'ember-intl/helpers/format-message';\nformatMessage;`;

		assert.match(transform(source), /"ember-intl\/helpers\/t"/);
	});
});
