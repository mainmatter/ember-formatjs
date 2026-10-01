'use strict';

const { isAppCode } = require('./is-app-code.cjs');

/**
 * in gjs / gts files, we need to change the formatMessage import to be the t import.
 */
module.exports = function (/* babel, pluginOptions */) {
	return {
		name: 'ember-formatjs/format-message-import-to-t',
		visitor: {
			ImportDeclaration(path, state) {
				// Only the app authors with this sugar; libraries ship already-compiled.
				if (!isAppCode(state?.filename)) {
					return;
				}

				if (path.node.source.value === 'ember-intl/helpers/format-message') {
					path.node.source.value = 'ember-intl/helpers/t';

					if (path.node.specifiers.length > 1) {
						throw new Error(`Importing additional specifiers from format-message is not allowed`);
					}

					if (path.node.specifiers[0].local.name !== 'formatMessage') {
						throw new Error(`default import may only be "formatMessage"`);
					}
				}
			},
		},
	};
};
