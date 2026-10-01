'use strict';

const assert = require('node:assert/strict');
const { join } = require('node:path');
const babel = require('@babel/core');

const buildTransform = require('../../src/template-plugin.cjs');
const { name: packageName } = require('../../package.json');

/**
 * The same transform has to work under both template compilers in the ecosystem:
 *
 *  - v2 is what `ember-cli-htmlbars` depends on, so it is what classic (broccoli) builds use
 *  - v4 is what Embroider uses under Vite
 *
 * Both are loaded here and every integration assertion runs against both, because the
 * whole point of this package is that one transform serves both pipelines. npm cannot install two versions of one
 * package name, so v2 is installed here under an alias. Its node entry point eagerly
 * resolves `ember-source`, so its browser entry is used instead;
 * with `targetFormat: 'hbs'` no template compiler is needed either way.
 */
const COMPILERS = [
	['v4 (Embroider / Vite)', 'babel-plugin-ember-template-compilation'],
	['v2 (ember-cli-htmlbars / classic)', 'babel-plugin-ember-template-compilation-v2/browser'],
];

// A path inside the app being built. `process.cwd()` is this package while tests run.
const APP_FILE = join(process.cwd(), 'app', 'components', 'greeting.gjs');
const ADDON_FILE = join(process.cwd(), 'node_modules', 'some-addon', 'components', 'greeting.gjs');

// `[sha512:contenthash:base64:6]` of "Hello world", which is also what
// `@formatjs/cli extract` produces for the same message.
const HELLO_WORLD = 't/eDuu';

function wrap(template, options) {
	const second = options ? `, ${options}` : '';

	return [
		`import { precompileTemplate } from '@ember/template-compilation';`,
		`export default precompileTemplate(${JSON.stringify(template)}${second});`,
	].join('\n');
}

// What `content-tag` turns a `<template>` in a `.gjs` / `.gts` file into.
function wrapTemplateTag(template) {
	return [
		`import { template } from '@ember/template-compiler';`,
		`export default template(${JSON.stringify(template)}, { eval() { return eval(arguments[0]); } });`,
	].join('\n');
}

async function compile(
	compilerPath,
	template,
	{ options, filename = APP_FILE, transformOptions, templateTag = false } = {},
) {
	const mod = await import(compilerPath);
	const plugin = mod.default ?? mod;
	const source = templateTag ? wrapTemplateTag(template) : wrap(template, options);

	const result = await babel.transformAsync(source, {
		filename,
		configFile: false,
		babelrc: false,
		plugins: [
			[
				plugin,
				{
					targetFormat: 'hbs',
					transforms: [buildTransform(transformOptions)],
				},
			],
		],
	});

	return result.code;
}

for (const [label, compilerPath] of COMPILERS) {
	describe(`template-plugin: ${label}`, function () {
		it('rewrites {{format-message}} to {{t}} with the hashed id', async function () {
			const code = await compile(compilerPath, `{{format-message "Hello world"}}`);

			assert.match(code, new RegExp(`\\{\\{t \\\\"${HELLO_WORLD}\\\\"\\}\\}`));
		});

		it('imports the t helper so strict-mode templates resolve it', async function () {
			const code = await compile(compilerPath, `{{format-message "Hello world"}}`, {
				options: '{ strictMode: true }',
			});

			assert.match(code, /import t from "ember-intl\/helpers\/t"/);
			assert.match(code, /scope: \(\) => \(\{\s*t\s*\}\)/);
		});

		it('imports the t helper for a <template> tag, which is always strict', async function () {
			const code = await compile(compilerPath, `{{format-message "Hello world"}}`, { templateTag: true });

			assert.match(code, /import t from "ember-intl\/helpers\/t"/);
			assert.match(code, new RegExp(`\\{\\{t \\\\"${HELLO_WORLD}\\\\"\\}\\}`));
		});

		it('leaves t to the resolver in loose templates, as classic builds always have', async function () {
			const code = await compile(compilerPath, `{{format-message "Hello world"}}`);

			assert.doesNotMatch(code, /ember-intl\/helpers\/t/);
			assert.doesNotMatch(code, /scope:/);
		});

		it('shares one t import between several messages in the same template', async function () {
			const code = await compile(compilerPath, `{{format-message "Hello world"}}{{format-message "Goodbye"}}`, {
				options: '{ strictMode: true }',
			});

			const imports = code.match(/import t from "ember-intl\/helpers\/t"/g) ?? [];

			assert.equal(imports.length, 1);
		});

		it('rewrites the helper inside a sub-expression', async function () {
			const code = await compile(compilerPath, `{{concat (format-message "Hello world")}}`);

			assert.match(code, new RegExp(`\\(t \\\\"${HELLO_WORLD}\\\\"\\)`));
		});

		it('hashes description into the id and discards the extra params', async function () {
			const withDescription = await compile(compilerPath, `{{format-message "Hello world" "a greeting"}}`);

			assert.doesNotMatch(withDescription, new RegExp(HELLO_WORLD));
			assert.doesNotMatch(withDescription, /a greeting/);
			assert.match(withDescription, /\{\{t \\"[^"]+\\"\}\}/);
		});

		it('keeps the helper name for the imported gjs form and hashes its argument', async function () {
			const code = await compile(compilerPath, `{{formatMessage "Hello world"}}`);

			assert.match(code, new RegExp(`\\{\\{formatMessage \\\\"${HELLO_WORLD}\\\\"\\}\\}`));
		});

		it('leaves templates inside node_modules alone', async function () {
			const code = await compile(compilerPath, `{{format-message "Hello world"}}`, { filename: ADDON_FILE });

			assert.match(code, /\{\{format-message \\"Hello world\\"\}\}/);
			assert.doesNotMatch(code, /ember-intl\/helpers\/t/);
		});

		it('honours a custom idInterpolationPattern', async function () {
			const code = await compile(compilerPath, `{{format-message "Hello world"}}`, {
				transformOptions: { idInterpolationPattern: '[sha512:contenthash:base64:10]' },
			});

			assert.match(code, /\{\{t \\"[^"]{10}\\"\}\}/);
			assert.doesNotMatch(code, new RegExp(`\\\\"${HELLO_WORLD}\\\\"`));
		});
	});
}

/**
 * The relevance check decides whether a template belongs to the app being built. It has
 * to cope with every way a build names the module: v2 and v4 both set `env.filename` to
 * the real path, while older compilation paths only set the classic notional module name.
 */
describe('template-plugin: module identification', function () {
	const REAL = 'ember-formatjs/template-plugin';
	const NOOP = 'ember-formatjs/noop-template-plugin';

	function nameFor(env) {
		return buildTransform()(env).name;
	}

	it('accepts env.filename, which is what both template compilers set', function () {
		assert.equal(nameFor({ filename: APP_FILE }), REAL);
	});

	it('accepts a legacy env.meta.moduleName with no filename', function () {
		assert.equal(nameFor({ meta: { moduleName: APP_FILE } }), REAL);
	});

	it('accepts a legacy top-level env.moduleName with no filename', function () {
		assert.equal(nameFor({ moduleName: APP_FILE }), REAL);
	});

	it('accepts the classic notional module name, which is not a real path', function () {
		assert.equal(nameFor({ meta: { moduleName: `${packageName}/templates/application.hbs` } }), REAL);
	});

	it('ignores templates from node_modules', function () {
		assert.equal(nameFor({ filename: ADDON_FILE }), NOOP);
	});

	it('transforms an old-Embroider app staged under node_modules', function () {
		const staged = join(process.cwd(), 'node_modules', '.embroider', 'rewritten-app', 'components', 'greeting.hbs');

		assert.equal(nameFor({ filename: staged }), REAL);
	});

	it('ignores a template it cannot place, rather than throwing', function () {
		assert.equal(nameFor({}), NOOP);
		assert.equal(nameFor({ filename: undefined, meta: {} }), NOOP);
		assert.equal(nameFor({ filename: '/somewhere/else/greeting.hbs' }), NOOP);
	});
});
