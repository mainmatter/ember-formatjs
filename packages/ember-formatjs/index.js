'use strict';

const path = require('path');
const { addPlugin, hasPlugin } = require('ember-cli-babel-plugin-helpers');
const defaults = require('babel-plugin-ember-formatjs/defaults');

/**
 * Classic (ember-cli / broccoli) wiring for `babel-plugin-ember-formatjs`.
 *
 * The transforms themselves live in that package and carry no Ember dependencies.
 * This addon exists only because a classic build has no other way to register a
 * template AST transform: `ember-cli-htmlbars` reads its plugin registry inside its own
 * `included()` hook, which has already run by the time `ember-cli-build.js` gets the app
 * back from the `EmberApp` constructor.
 *
 * Embroider + Vite apps should wire the same two plugins directly in `babel.config.*`
 * instead; see the README. `@embroider/compat` can pick up this addon's registrations
 * through `babelCompatSupport()` and `templateCompatSupport()`, but that path is untested.
 */
module.exports = {
	name: require('./package').name,

	included(...args) {
		this._super.included.apply(this, ...args);

		if (!this.shouldTranspile()) {
			this.ui.writeLine('Do not transpile i18n with ember-formatjs');
			return;
		}

		this.ui.writeLine('Transpile i18n with ember-formatjs');

		this._setupBabel();
	},

	_setupBabel() {
		const pluginPath = require.resolve('babel-plugin-ember-formatjs');
		const config = this.addonOptions();
		const app = this._findHost();

		if (!hasPlugin(app, pluginPath)) {
			addPlugin(app, [pluginPath, config, 'ember-formatjs']);
		}
	},

	setupPreprocessorRegistry(type, registry) {
		if (type !== 'parent' || !this.shouldTranspile()) {
			return;
		}
		const options = this.addonOptions();
		const plugin = this._buildPlugin(options);

		plugin.parallelBabel = {
			requireFile: __filename,
			buildUsing: '_buildPlugin',
			params: options,
		};
		registry.add('htmlbars-ast-plugin', plugin);
	},

	_buildPlugin(options) {
		return {
			name: 'ember-formatjs/template-plugin',
			ext: 'hbs',
			plugin: require('babel-plugin-ember-formatjs/template-plugin')(options),
			baseDir: () => {
				return path.resolve(__dirname);
			},
		};
	},

	shouldTranspile() {
		return true;
	},

	addonOptions(app) {
		app = app || this._findHost();
		const addonOptions = (app.options ?? {})['ember-formatjs'] || {};

		return Object.assign({}, defaults, addonOptions);
	},
};
