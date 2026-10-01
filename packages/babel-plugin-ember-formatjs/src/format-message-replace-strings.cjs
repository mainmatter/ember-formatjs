'use strict';

const { declare } = require('@babel/helper-plugin-utils');
const { interpolateName } = require('@formatjs/ts-transformer');
const defaults = require('./defaults.cjs');
const { isAppCode } = require('./is-app-code.cjs');

const getVariableValue = (args, variable, preserveWhitespace) => {
	const property = args?.properties?.find?.(p => p.key?.name === variable);
	const propertyValue = property?.value;

	let value = propertyValue?.value;
	if (propertyValue?.type === 'TemplateLiteral') {
		// For a string type TemplateLiteral we only take first quasi
		// because dynamic expressions / concatenation inside a message are not allowed anyways.
		value = propertyValue.quasis[0].value.cooked;
	}

	// Replicates what formatjs does by default
	// Formatjs has an option 'preserveWhitespace' which is `false` by default
	// We need to replicate this to also make certain strings equal regardless of their format.
	// See `messageWithBackticks` and `messageWithMultilineBackticks` inside ../node-tests/fixtures/format-message-replace/output
	if (!preserveWhitespace) {
		return value?.trim().replace(/\s+/gm, ' ');
	}
	return value;
};

/**
 * Only the FormatJS authoring shape is ours to rewrite:
 *
 *     intl.formatMessage({ defaultMessage: 'Hello' })
 *
 * `ember-intl`'s own `formatMessage(descriptor, values)` signature takes the descriptor
 * as a variable rather than an object literal. Matching on the literal keeps us off it.
 */
const isFormatJsDescriptor = firstArgument => {
	if (firstArgument?.type !== 'ObjectExpression') {
		return false;
	}

	return firstArgument.properties?.some?.(p => p.key?.name === 'defaultMessage' || p.key?.name === 'id');
};

/**
 * This plugin is specifically for updating the version of formatMessage from the intl service.
 *
 * e.g.: this.intl.formatMessage(...)
 */
module.exports = declare((api, pluginOptions) => {
	const options = Object.assign({}, defaults, pluginOptions);

	const preserveWhitespace = options.preserveWhitespace;
	const idInterpolationPattern = options.idInterpolationPattern;

	return {
		name: 'ember-formatjs/format-message-replace',

		visitor: {
			CallExpression(path, state) {
				const filename = state?.filename ?? api.File?.path;

				if (!isAppCode(filename)) {
					return;
				}

				if (
					(path.node?.callee?.object?.name === 'intl' || // intl.formatMessage()
						path.node?.callee?.object?.property?.name === 'intl') && // <obj>.intl.formatMessage()
					path.node?.callee?.property?.name === 'formatMessage'
				) {
					const args = path.node?.arguments;
					const firstHash = args?.[0];

					if (!isFormatJsDescriptor(firstHash)) {
						return;
					}

					path.node.callee.property.name = 't';

					const valuesHash = args?.[1];
					const defaultMessage = getVariableValue(firstHash, 'defaultMessage', preserveWhitespace);
					const description = getVariableValue(firstHash, 'description', true);
					const translationId = getVariableValue(firstHash, 'id', false);

					const id = interpolateName(
						{
							resourcePath: filename,
						},
						idInterpolationPattern,
						{
							content: description ? `${defaultMessage}#${description}` : defaultMessage,
						},
					);

					const key = {
						type: 'StringLiteral',
						value: translationId || id,
					};

					// Assigning into `arguments` by index leaves holes behind when the call had
					// fewer arguments than we write, which prints as `intl.t('key', )`.
					path.node.arguments = valuesHash ? [key, valuesHash] : [key];
				}
			},
		},
	};
});
