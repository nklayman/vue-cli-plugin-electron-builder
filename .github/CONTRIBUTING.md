## Contributing

### Reporting issues
Please follow the issue templates when reporting an issue. Don't just say "it doesn't work". Provide an error log, your package.json, and any other relevant info. If you don't give reproduction steps, it will be much longer before your issue is worked on.

### Styling

VCP-electron-builder uses the [standard style guide](https://standardjs.com/), enforced with a combination of prettier + eslint. Before submitting a PR, make sure to run prettier and then eslint on all of your files. Note that `yarn lint` only runs eslint, not prettier.

### Testing

VCP-electron-builder uses [Jest](http://jestjs.io/) for testing. It has e2e tests for regular build and serve and typescript build and serve. Because of this, tests can take up to 5 minutes to run. If you have a slower computer (less than quad core) it might help to add the `--runInBand` argument to `yarn test`. The tests only work on Linux or Windows, not MacOS. Please run all tests and make sure they pass before submitting a pull request. Github Actions are used for CI.
