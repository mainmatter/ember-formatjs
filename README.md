# ember-formatjs

## What it does?

Ast plugin replaces x helper with t helper.
{{x "example text" "example description"}}
{{t "key from formatjs}}

## When using Babel

useful in libraries,
in your babel config, you may want both the JS and template transform plugins:

```js
{
  "plugins": [
    [
      "babel-plugin-ember-template-compilation",
      {
        "targetFormat": "hbs",
        "transforms": [["ember-intl/template-plugin", {}]]
      }
    ],
    "module:ember-intl/babel-plugin",
		// ...
  ]
}
```

## Options in ember-cli-build

Custom idInterpolationPattern can be set in ember-cli-build if needed. It should be the same pattern used for en-en.json extraction.

```js
let app = new EmberApp(defaults, {
	'ember-formatjs': {
		idInterpolationPattern: '[sha512:contenthash:base64:6]', //this interpolation pattern is default
	},
});
```
