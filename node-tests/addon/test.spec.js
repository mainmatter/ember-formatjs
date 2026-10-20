const assert = require('node:assert/strict');
const { join } = require('node:path');

const addon = require('../../index');
const defaults = require('../../lib/babel/defaults');

// The parts under test never reach the rest of ember-cli, so a stub host is enough.
function build(app = { options: {} }) {
	return Object.assign(Object.create(addon), {
		ui: { writeLine() {} },
		_findHost: () => app,
	});
}

function registered(subject, type = 'parent') {
	const added = [];

	subject.setupPreprocessorRegistry(type, {
		add(name, entry) {
			added.push({ name, entry });
		},
	});

	return added;
}

describe('addon: classic wiring', function () {
	it('registers the template transform as an htmlbars ast plugin', function () {
		const added = registered(build());

		assert.equal(added.length, 1);
		assert.equal(added[0].name, 'htmlbars-ast-plugin');
		assert.equal(added[0].entry.ext, 'hbs');
		assert.equal(typeof added[0].entry.plugin, 'function');
	});

	it('registers nothing for the addon itself', function () {
		assert.deepEqual(registered(build(), 'self'), []);
	});

	it('registers a transform that rewrites app templates only', function () {
		const [{ entry }] = registered(build());
		const nameFor = moduleName => entry.plugin({ meta: {}, moduleName }).name;

		assert.equal(
			nameFor(join(process.cwd(), 'app', 'templates', 'application.hbs')),
			'ember-intl/ember-formatjs/template-plugin',
		);
		assert.equal(
			nameFor(join(process.cwd(), 'node_modules', 'some-addon', 'templates', 'application.hbs')),
			'ember-intl/ember-formatjs/noop-template-plugin',
		);
	});

	it('describes itself for parallel builds', function () {
		const [{ entry }] = registered(build());
		const { requireFile, buildUsing, params } = entry.parallelBabel;

		// ember-cli rebuilds the plugin in a worker from exactly these three fields.
		const rebuilt = require(requireFile)[buildUsing](params);

		assert.equal(requireFile, require.resolve('../../index'));
		assert.equal(rebuilt.name, entry.name);
		assert.equal(rebuilt.ext, entry.ext);
	});

	it('falls back to the defaults', function () {
		assert.deepEqual(build().addonOptions(), defaults);
	});

	it('lets the app override the options', function () {
		const app = { options: { 'ember-formatjs': { idInterpolationPattern: '[sha512:contenthash:base64:10]' } } };
		const options = build(app).addonOptions();

		assert.equal(options.idInterpolationPattern, '[sha512:contenthash:base64:10]');
		assert.equal(options.preserveWhitespace, defaults.preserveWhitespace);
	});

	it('adds the babel plugin to the app once', function () {
		const app = { options: {} };
		const subject = build(app);

		subject._setupBabel();
		subject._setupBabel();

		assert.equal(app.options.babel.plugins.length, 1);
		assert.equal(app.options.babel.plugins[0][0], require.resolve('../../babel-plugin'));
	});
});
