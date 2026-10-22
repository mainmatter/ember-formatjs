'use strict';

/**
 * The transforms rewrite authoring sugar that only the app uses. Under Embroider + Vite,
 * library code such as ember-intl's own goes through the same babel pass as the app's,
 * so anything under node_modules is left alone, except the app itself when old Embroider
 * stages it there.
 *
 * A missing filename counts as app code, so `babel.transform` calls without one keep
 * working.
 *
 * @param {string | undefined} filename
 */
module.exports = function isAppCode(filename) {
	if (!filename || !filename.includes('/node_modules/')) {
		return true;
	}

	return filename.includes('.embroider/rewritten-app');
};
