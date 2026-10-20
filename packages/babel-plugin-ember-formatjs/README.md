# babel-plugin-ember-formatjs

The build-time transforms behind [`ember-formatjs`](https://github.com/mainmatter/ember-formatjs#readme), with no Ember dependencies. They rewrite FormatJS-style inline messages to `ember-intl`'s key-based calls:

```
{{format-message 'Hello!'}}                           ->  {{t 'OpKKos'}}
this.intl.formatMessage({ defaultMessage: 'Hello!' }) ->  this.intl.t('OpKKos')
```

Embroider + Vite apps install this package and wire it into their Babel config. Classic ember-cli apps install `ember-formatjs` instead, which depends on this package and wires it up for them. The [repository README](https://github.com/mainmatter/ember-formatjs#readme) covers both setups.

## Entry points

| import                                        | what it is             | where it goes                                                    |
| --------------------------------------------- | ---------------------- | ---------------------------------------------------------------- |
| `babel-plugin-ember-formatjs`                 | the JS/TS transforms   | the Babel `plugins` array                                        |
| `babel-plugin-ember-formatjs/template-plugin` | the template transform | the `babel-plugin-ember-template-compilation` `transforms` array |
| `babel-plugin-ember-formatjs/defaults`        | the default options    |                                                                  |

The template transform is a factory: call it, optionally with options, and put the result in the `transforms` array.
