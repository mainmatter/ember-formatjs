'use strict';

const { interpolateName } = require('@formatjs/ts-transformer');
const defaults = require('./defaults.cjs');

/**
 * node.path.original is DEPRECATED in newer versions of @glimmer/syntax
 * '.value' is the new property to use, but it does not exist in older versions
 * of @glimmer/syntax
 *
 * Exact deprecation messages
 *  - [on a StringLiteral] The original property on literal nodes is deprecated, use value instead
 *  - [on a PathExpression] The parts property on path nodes is deprecated, use head and tail instead
 */
function getValue(node) {
	if (!node) {
		return;
	}

	return 'value' in node ? node.value : node.original;
}

function setValue(node, newValue) {
	if (!node) {
		return;
	}

	if ('value' in node) {
		node.value = newValue;
		return;
	}

	node.original = newValue;
}

const CWD = process.cwd();

/**
 * The consuming app's package name, used to recognise the "notional" module names that
 * classic builds produce (`my-app/templates/application.hbs`) as opposed to real paths.
 *
 * Read lazily: this module is required from a `babel.config.*` file in Vite apps, where
 * the process may not be rooted at a directory containing a package.json at all.
 */
let cachedAppName;
function appName() {
	if (cachedAppName === undefined) {
		try {
			cachedAppName = require(`${CWD}/package.json`).name || null;
		} catch {
			cachedAppName = null;
		}
	}

	return cachedAppName;
}

/**
 * A template transform operates on all templates.
 * We need to lock our transform down to
 * - templates not in node_modules
 *   - unless template is in .embroider/rewritten-app (old embroider)
 * - templates within our CWD
 *
 * Don't double-transform files.
 * We expect libraries to have built themselves with our translation system.
 *
 * @param {string} identifier a module name or file path naming the template
 */
function isRelevantIdentifier(identifier) {
	if (typeof identifier !== 'string' || identifier.length === 0) {
		return false;
	}

	const name = appName();
	if (name && identifier.startsWith(name)) {
		return true;
	}

	if (!identifier.startsWith(CWD)) {
		return false;
	}

	const isInNodeModules = identifier.includes('/node_modules/');
	const isOldEmbroider = identifier.includes('.embroider/rewritten-app');

	return !isInNodeModules || isOldEmbroider;
}

/**
 * Every way the surrounding build names the module being compiled.
 *
 * `babel-plugin-ember-template-compilation` sets `filename` to the real on-disk path and
 * `moduleName` to the classic notional name, which for a standalone `.hbs` compiled by
 * `ember-cli-htmlbars` are different strings living in different roots. Either one is
 * enough to recognise app code, so we check all of them.
 */
function moduleIdentifiers(env) {
	return [env.filename, env.meta?.moduleName, env.moduleName].filter(Boolean);
}

const NOOP = {
	name: 'ember-formatjs/noop-template-plugin',
	visitor: {},
};

function buildTransform(passedOptions) {
	const options = Object.assign({}, defaults, passedOptions);

	return function (env) {
		const identifiers = moduleIdentifiers(env);

		if (!identifiers.some(isRelevantIdentifier)) {
			return NOOP;
		}

		// Only used for `[path]`-style interpolation patterns; the default
		// `[sha512:contenthash:base64:6]` hashes message content and ignores this.
		const resourcePath = identifiers[0];

		/**
		 * `jsutils` lets a template AST transform add imports to the surrounding module
		 * scope, and de-dupes them. It is provided by `babel-plugin-ember-template-compilation`
		 * from v2 on, which is both what `ember-cli-htmlbars` uses in classic builds and what
		 * Embroider uses under Vite. Strict-mode templates (`.gjs` / `.gts`) *require* it:
		 * writing `{{t ...}}` into a strict template without importing `t` fails to compile.
		 *
		 * Loose templates (`.hbs`) have a resolver, so they get a bare `{{t}}`, exactly as
		 * before this package was split out. That keeps classic output unchanged, and under
		 * Embroider the loose-mode resolver transform binds `t` like any hand-written `{{t}}`.
		 */
		const jsutils = env.strictMode ? env.meta?.jsutils : undefined;

		function localTHelper(path) {
			if (jsutils) {
				return jsutils.bindImport('ember-intl/helpers/t', 'default', path, {
					nameHint: 't',
				});
			}

			return 't';
		}

		function transformHelper(node, path) {
			const name = getValue(node.path);
			if (name === 'format-message' || name === 'formatMessage') {
				/**
				 * defaultMessage and description are trimmed and multiple white spaces are replaced with a single space when generating the ID to ensure white space does not result in a new id
				 */
				const defaultMessage = getValue(node.params[0])?.trim().replace(/\s+/gm, ' ');
				const description = getValue(node.params[1])?.trim().replace(/\s+/gm, ' ');

				const id = interpolateName(
					{
						resourcePath,
					},
					options.idInterpolationPattern,
					{
						content: description ? `${defaultMessage}#${description}` : defaultMessage,
					},
				);

				// We don't want to change gjs/gts usage
				// instead, we'll import the t helper as formatMessage
				if (name !== 'formatMessage') {
					setValue(node.path, localTHelper(path));
				}

				// set the hashed value
				node.params[0].value = id;

				// there _may_ be more params, but here we discard all of them except the first
				node.params = [node.params[0]];
			}
		}

		return {
			name: 'ember-formatjs/template-plugin',

			visitor: {
				MustacheStatement: transformHelper,
				SubExpression: transformHelper,
			},
		};
	};
}

module.exports = buildTransform;
