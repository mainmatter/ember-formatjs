# ember-formatjs

Classic (ember-cli / broccoli) wiring for [`babel-plugin-ember-formatjs`](../babel-plugin-ember-formatjs), which combines the FormatJS authoring API with `ember-intl`.

```
ember install ember-intl ember-formatjs
```

That is the whole setup. This addon registers the two transforms with the classic build and does nothing else; all the transform logic lives in the plugin package, which comes along as a dependency.

**Embroider + Vite apps should install `babel-plugin-ember-formatjs` instead** and wire it into `babel.config.mjs`; the [repository README](../../README.md) shows how. That needs neither this addon nor `@embroider/compat`. `@embroider/compat` can pick up this addon's registrations through `babelCompatSupport()` and `templateCompatSupport()`, but this addon is not tested that way.

See the [repository README](../../README.md) for usage, the extract and compile workflow, and options.
