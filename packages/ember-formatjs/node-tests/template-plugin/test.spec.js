const assert = require('node:assert/strict');
const { join } = require('node:path');
const babel = require('@babel/core');

const buildTransform = require('../../template-plugin');
const { name: packageName } = require('../../package.json');

/**
 * Runs the transform the way a build does, through babel-plugin-ember-template-compilation.
 * v2 is what ember-cli-htmlbars uses and v4 is what Embroider uses. v2 is installed under
 * an alias, and its browser entry is used because the node entry requires ember-source's
 * template compiler even when `targetFormat: 'hbs'` means none is needed.
 */
const COMPILERS = [
	['v2 (ember-cli-htmlbars)', 'babel-plugin-ember-template-compilation-v2/browser'],
	['v4 (Embroider)', 'babel-plugin-ember-template-compilation'],
];

// The template plugin treats `process.cwd()` as the app, which is this repo while tests run.
const APP_FILE = join(process.cwd(), 'app', 'components', 'greeting.js');
const ADDON_FILE = join(process.cwd(), 'node_modules', 'some-addon', 'components', 'greeting.js');

// `[sha512:contenthash:base64:6]` of "Hello world", which is also what
// `@formatjs/cli extract` produces for the same message.
const HELLO_WORLD = 't/eDuu';

async function compile(compilerPath, template, { filename = APP_FILE, transformOptions } = {}) {
	const mod = await import(compilerPath);
	const plugin = mod.default ?? mod;
	const source = [
		`import { precompileTemplate } from '@ember/template-compilation';`,
		`export default precompileTemplate(${JSON.stringify(template)});`,
	].join('\n');

	const result = await babel.transformAsync(source, {
		filename,
		configFile: false,
		babelrc: false,
		plugins: [[plugin, { targetFormat: 'hbs', transforms: [buildTransform(transformOptions)] }]],
	});

	return result.code;
}

for (const [label, compilerPath] of COMPILERS) {
	describe(`template-plugin: ${label}`, function () {
		it('rewrites {{format-message}} to {{t}} with the hashed id', async function () {
			const code = await compile(compilerPath, `{{format-message "Hello world"}}`);

			assert.match(code, new RegExp(`\\{\\{t \\\\"${HELLO_WORLD}\\\\"\\}\\}`));
		});

		it('rewrites the helper inside a sub-expression', async function () {
			const code = await compile(compilerPath, `{{concat (format-message "Hello world")}}`);

			assert.match(code, new RegExp(`\\(t \\\\"${HELLO_WORLD}\\\\"\\)`));
		});

		it('hashes the description into the id and drops the extra params', async function () {
			const code = await compile(compilerPath, `{{format-message "Hello world" "a greeting"}}`);

			assert.doesNotMatch(code, new RegExp(HELLO_WORLD));
			assert.doesNotMatch(code, /a greeting/);
			assert.match(code, /\{\{t \\"[^"]+\\"\}\}/);
		});

		it('keeps the formatMessage name used in gjs and hashes its argument', async function () {
			const code = await compile(compilerPath, `{{formatMessage "Hello world"}}`);

			assert.match(code, new RegExp(`\\{\\{formatMessage \\\\"${HELLO_WORLD}\\\\"\\}\\}`));
		});

		it('leaves templates inside node_modules alone', async function () {
			const code = await compile(compilerPath, `{{format-message "Hello world"}}`, { filename: ADDON_FILE });

			assert.match(code, /\{\{format-message \\"Hello world\\"\}\}/);
		});

		it('honours a custom idInterpolationPattern', async function () {
			const code = await compile(compilerPath, `{{format-message "Hello world"}}`, {
				transformOptions: { idInterpolationPattern: '[sha512:contenthash:base64:10]' },
			});

			assert.match(code, /\{\{t \\"[^"]{10}\\"\}\}/);
		});
	});
}

describe('template-plugin: module identification', function () {
	const REAL = 'ember-intl/ember-formatjs/template-plugin';
	const NOOP = 'ember-intl/ember-formatjs/noop-template-plugin';

	function nameFor(env) {
		return buildTransform()(env).name;
	}

	it('accepts the classic module name, which is not a real path', function () {
		assert.equal(nameFor({ meta: { moduleName: `${packageName}/templates/application.hbs` } }), REAL);
	});

	it('accepts a top-level env.moduleName', function () {
		assert.equal(nameFor({ meta: {}, moduleName: APP_FILE }), REAL);
	});

	it('accepts env.filename alone, which is all v4 sets', function () {
		assert.equal(nameFor({ meta: {}, filename: APP_FILE }), REAL);
	});

	it('ignores a template it cannot place, rather than throwing', function () {
		assert.equal(nameFor({}), NOOP);
		assert.equal(nameFor({ meta: {} }), NOOP);
	});

	it('ignores templates from node_modules', function () {
		assert.equal(nameFor({ meta: {}, moduleName: ADDON_FILE }), NOOP);
	});

	it('transforms an old-Embroider app staged under node_modules', function () {
		const staged = join(process.cwd(), 'node_modules', '.embroider', 'rewritten-app', 'components', 'greeting.hbs');

		assert.equal(nameFor({ meta: {}, moduleName: staged }), REAL);
	});

	it('ignores templates outside the app', function () {
		assert.equal(nameFor({ meta: {}, moduleName: '/somewhere/else/greeting.hbs' }), NOOP);
	});
});
