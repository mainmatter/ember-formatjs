'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');

const addon = require('../index.js');
const defaults = require('babel-plugin-ember-formatjs/defaults');

/**
 * The classic wiring is the reason this package still exists, so it needs to be held in
 * place by something other than a manual check. These tests stand the addon up with a
 * stub host, since the parts under test never touch the rest of ember-cli.
 */
function build(appOptions = {}) {
	return Object.assign(Object.create(addon), {
		ui: { writeLine() {} },
		_findHost: () => ({ options: appOptions }),
	});
}

function collectRegistry(subject, type = 'parent') {
	const added = [];

	subject.setupPreprocessorRegistry(type, {
		add(name, entry) {
			added.push({ name, entry });
		},
	});

	return added;
}

describe('ember-formatjs: classic wiring', function () {
	it('registers the template transform as an htmlbars ast plugin', function () {
		const added = collectRegistry(build());

		assert.equal(added.length, 1);
		assert.equal(added[0].name, 'htmlbars-ast-plugin');
		assert.equal(added[0].entry.ext, 'hbs');
		assert.equal(typeof added[0].entry.plugin, 'function');
	});

	it('registers nothing for the addon itself', function () {
		assert.deepEqual(collectRegistry(build(), 'self'), []);
	});

	it('registers a transform that actually rewrites app templates', function () {
		const [{ entry }] = collectRegistry(build());
		const filename = path.join(process.cwd(), 'app', 'components', 'greeting.hbs');

		// The factory returns a no-op for anything it should not touch, so the name tells us
		// whether this template was recognised as the app's.
		assert.equal(entry.plugin({ filename }).name, 'ember-formatjs/template-plugin');
		assert.equal(entry.plugin({}).name, 'ember-formatjs/noop-template-plugin');
	});

	it('describes itself for parallel builds', function () {
		const [{ entry }] = collectRegistry(build());

		assert.equal(entry.parallelBabel.requireFile, require.resolve('../index.js'));

		// ember-cli rebuilds the plugin in a worker from exactly these three fields.
		const rebuilt = require(entry.parallelBabel.requireFile)[entry.parallelBabel.buildUsing](
			entry.parallelBabel.params,
		);

		assert.equal(rebuilt.name, entry.name);
		assert.equal(rebuilt.ext, entry.ext);
	});

	it('resolves baseDir inside this package, not the consuming app', function () {
		const [{ entry }] = collectRegistry(build());

		assert.equal(entry.baseDir(), path.resolve(__dirname, '..'));
	});

	it('falls back to the shared defaults', function () {
		assert.deepEqual(build().addonOptions(), defaults);
	});

	it('lets the app override the id interpolation pattern', function () {
		const options = build({
			'ember-formatjs': { idInterpolationPattern: '[sha512:contenthash:base64:10]' },
		}).addonOptions();

		assert.equal(options.idInterpolationPattern, '[sha512:contenthash:base64:10]');
		assert.equal(options.preserveWhitespace, defaults.preserveWhitespace);
	});

	it('adds the babel plugin to the host exactly once', function () {
		const app = { options: {} };
		const subject = Object.assign(Object.create(addon), {
			ui: { writeLine() {} },
			_findHost: () => app,
		});

		subject._setupBabel();
		subject._setupBabel();

		const plugins = app.options.babel.plugins;

		assert.equal(plugins.length, 1);
		assert.equal(plugins[0][0], require.resolve('babel-plugin-ember-formatjs'));
	});
});
