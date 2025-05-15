# ember-formatjs

## Main purpose

[ember-intl](https://ember-intl.github.io/ember-intl/) is the most common solution for managing translations in Ember apps. It provides a number of useful tools to format messages in both code and template files, and even includes test-helpers.

One downside of the default configuration of ember-intl is that it adopts a [key-based translation system](https://ember-intl.github.io/ember-intl/docs/helpers/t), where instead of writing the strings that your end user will see in your component templates, you write a dot-separated key that represents a nested data structure of your translation files. This can be quite a challenging system for teams of any scale to manage:

```js
this.intl.t('you.must.maintain.this');
```

Other tools, like [FormatJS](https://formatjs.github.io/), allow you to invert the process of translation by [auto-generating keys](https://formatjs.github.io/docs/getting-started/message-extraction) from translation strings in your app, and extract those translations into a file formatted correctly:

```js
// You can write this in your code, it will end up in your translation file.
intl.formatMessage({
	defaultMessage: 'Hello world',
});
```

`ember-formatjs` integrates `ember-intl` and `formatjs` to make use of the inline translation strings recommended by FormatJs while sticking to `ember-intl` to manage translations at runtime.

## Compatibility

- Ember classic >= 3.28

## Usage

### 1. Install

```
ember install ember-intl ember-formatjs
```

### 2. Setup

- Configure your locale following [`ember-intl`](https://ember-intl.github.io/ember-intl/docs/quickstart#set-your-app-s-locale) starter guide.

- At the root of your app, create a `locale` folder.

### 3. Write messages

In a template, use the `{{format-message}}` helper with the message the end user sees:

```hbs
{{format-message 'Hello!'}}
```

In `js` and `ts` files, inject [`ember-intl` service](https://ember-intl.github.io/ember-intl/docs/services/introduction) to use translations, but rely on the `formatMessage` method to define the message descriptor:

```js
import { service } from '@ember/service';

export default class MyEmberController extends Controller {
	@service intl;

	@action
	onGreeting() {
		this.modal.show(
			this.intl.formatMessage({
				defaultMessage: 'Hello!',
			}),
		);
	}
}
```

## Wrap this in a workflow

Since `ember-formatjs` relies on both `ember-intl` and `format-js`, you need to acquire a bit of knowledge about both of these tools to figure out what's going on and how to setup the workflow you prefer. In this section, let's put an example of what [FormatJs docs explain in "The workflow" section](https://formatjs.github.io/docs/getting-started/application-workflow#the-workflow).

### One string, two formats

In your application whole lifecycle, from written code to runtime, your translation files, at some point, will exist in 2 different versions: the "runtime" format, and the translation management system (TMS) format (Crowdin, Lokalise, Smartling...)

The runtime format is the one expected by the lib you use to manage translations at runtime:

```json
{
	"wafoOY": "I am formatted for ember-intl"
}
```

The TMS format is the one you need to communicate with the TMS you use:

```json
{
	"wafoOY": {
		"message": "I am formatted for Crowdin"
	},
	"wafoOW": {
		"translation": "I am formatted for Lokalise"
	}
}
```

### extract and compile

FormatJs finds all the formatted messages in your codebase and extract them into a translation file like `en-us.json`; and since it knows that you probably work with a TMS, it offers you ways to format the `json` for the TMS you use, using optional [formatters](https://formatjs.github.io/docs/getting-started/message-extraction#translation-management-system-tms-integration). If your TMS is not supported, you can write your own formatter.

When using `ember-formatjs`, you can install `@formatjs/cli` and include the extract command from `@formatjs/cli` in your workflow. For instance:

```json
"extract": "npx formatjs extract './app/**/*.(hbs|js)' > ./locale/en-us.json"
```

The result of this command creates the "source of truth" file that you upload to the TMS. Then, your translators will complete the translations (fr-fr, de-de, en-gb...), and you will include the download somewhere in your workflow. The files you download from the TMS are in the TMS format, and therefore are not usable at runtime, `ember-intl` doesn't understand them.

To put them back to a "runtime" format that `ember-intl` understands, you can use the `compile` command from `@formatjs/cli`:

```json
"compile": "npx formatjs compile './locale/en-us.json' --out-file './translations/en-us.json'"
```

And this how you close the loop: you write English messages in the code, FormatJs _extract_ them in a `locale/en-us.json` that you upload to the TMS, then you download the supported language files from the TMS, _compile_ them and store them in the `translations/` folder that `ember-intl` can use to get your translations working at runtime.

### Many possible workflows

The section above gives you the key commands to get things working but you might be a bit frustrated that it doesn't say more exactly where and when to run them. This is because many different workflows are possible. For instance, you can run these commands manually or get the CI execute them; you could decide to stage only the TMS version of the translation files and do the compile at build time; or you could produce directly the compiled version of the source file and stage it, then rely on some custom tools to communicate with a TMS...

### Ids auto-generation happens twice

When using FormatJs, ids are generated by transforming the string message with an interpolation pattern. It means that as long as the message doesn't change, the id doesn't change either. Whatever you use FormatJs alone or `@formatjs/cli` and `ember-formatjs` together, the id generation takes place twice:

1. Extraction: The strings messages detected in the code are extracted by FormatJs `extract` command in the translations source file (e.g. `locale/en-us.json`). So in the source file, you have an id is generated to serve as message keys.

2. Code transpilation: during the build, `ember-formatjs` translates your messages' syntax `{{format-message 'Hello'}}` into the classic `ember-intl` syntax `{{t 'OpKKos'}}`, which is key-based, and therefore an id is generated for the key. This translation layer allows `ember-intl` to behave as usual at runtime.

To sum it up, the interpolation pattern you use for extraction and transpilation should be exactly the same, else you'll end up with a mismatch between the keys in your `json` and the keys written in your output code, leading to missing translations issues. The default interpolation pattern is `[sha512:contenthash:base64:6]`.

## Options

A custom `idInterpolationPattern` can be set in the `ember-cli-build.js` if needed. ⚠️ If you customize this, be very careful to use the same interpolation pattern for messages extraction.

```js
let app = new EmberApp(defaults, {
	'ember-formatjs': {
		idInterpolationPattern: '[sha512:contenthash:base64:6]', //this interpolation pattern is default
	},
});
```
