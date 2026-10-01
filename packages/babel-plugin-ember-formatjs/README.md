# babel-plugin-ember-formatjs

Build-time transforms that let you author inline English source strings with FormatJS ergonomics and have them rewritten to `ember-intl`'s key-based calls during the build.

```
{{format-message 'Hello'}}                        ->  {{t 'OpKKos'}}
this.intl.formatMessage({ defaultMessage: 'Hi' }) ->  this.intl.t('4Wd9pg')
```

There is no runtime: at runtime this is just `ember-intl`.

This package carries no Ember dependencies and is what an **Embroider + Vite** app installs. Classic ember-cli apps should install [`ember-formatjs`](../ember-formatjs) instead, which depends on this package and wires it into the classic build for you.

See the [repository README](../../README.md) for setup, the extract and compile workflow, and options.

## Entry points

| import                                        | what it is                | where it goes                                                    |
| --------------------------------------------- | ------------------------- | ---------------------------------------------------------------- |
| `babel-plugin-ember-formatjs`                 | the JS/TS transforms      | the Babel `plugins` array                                        |
| `babel-plugin-ember-formatjs/template-plugin` | the Glimmer AST transform | the `babel-plugin-ember-template-compilation` `transforms` array |
| `babel-plugin-ember-formatjs/defaults`        | the default options       | wherever you need to read them                                   |

The template transform is a factory: call it, optionally with options, and put the result in the `transforms` array.

## Compatibility

The template transform works under `babel-plugin-ember-template-compilation` v2, which is what `ember-cli-htmlbars` uses in classic builds, and v4, which is what Embroider uses under Vite. Both are covered in CI.

## Credit

Adapted from NullVoxPopuli's `automatic-i18n-tools` work in `ember-intl`.
