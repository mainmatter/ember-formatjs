'use strict';

const { declare } = require('@babel/helper-plugin-utils');
const formatMessageImportToT = require('./format-message-import-to-t.cjs');
const formatMessageReplaceStrings = require('./format-message-replace-strings.cjs');

module.exports = declare((api, pluginOptions) => {
	api.assertVersion('^7.0.0-0 || ^8.0.0-0');

	// Each sub-plugin's state is separate
	const toT = formatMessageImportToT(api, pluginOptions);
	const replaceStrings = formatMessageReplaceStrings(api, pluginOptions);

	return {
		name: 'ember-formatjs',
		visitor: {
			// NOTE: the sub-plugins currently don't implement any of the same visitors.
			//       if they ever did, this would need to change -- similar to the strategy used in ember-scoped-css
			...toT.visitor,
			...replaceStrings.visitor,
		},
	};
});
