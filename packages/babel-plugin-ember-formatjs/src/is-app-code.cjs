'use strict';

/**
 * These transforms rewrite an authoring convenience that only the consuming app uses.
 * Library code must never be rewritten: addons ship already compiled, and under
 * Embroider + Vite `ember-intl`'s own sources flow through the same babel pass as the
 * app's. `ember-intl`'s internal `intl.formatMessage(descriptor, values)` calls look
 * close enough to the authoring shape that an unscoped transform rewrites them and
 * leaks the raw id pattern into the translation keys.
 *
 * A missing filename is treated as app code so that programmatic `babel.transform`
 * calls, which pass no filename, keep working.
 *
 * @param {string | undefined} filename
 */
function isAppCode(filename) {
	if (!filename) {
		return true;
	}

	if (!filename.includes('/node_modules/')) {
		return true;
	}

	// Old Embroider stages the app itself underneath node_modules.
	return filename.includes('.embroider/rewritten-app');
}

module.exports = { isAppCode };
