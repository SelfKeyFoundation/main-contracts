# selfkey-main-contracts

{{description}}

* `develop` — [![CircleCI]({{circleci-badge-develop-link}})]({{circleci-project-develop-link}})
* `master` — [![CircleCI]({{circleci-badge-master-link}})]({{circleci-project-master-link}})

## Overview

This template is created to be used with [create-project](https://github.com/mafintosh/create-project), upon creating a new project, this README should be overwritten according to the project's needs.

## Development

Smart contracts are being implemented using Solidity `0.5.4`.

### Prerequisites

* [NodeJS](htps://nodejs.org), version 9.5+ (I use [`nvm`](https://github.com/creationix/nvm) to manage Node versions — `brew install nvm`.)
* [truffle](http://truffleframework.com/), which is a comprehensive framework for Ethereum development. `npm install -g truffle` — this should install the latest truffle version.

### Initialization

    npm install

### Testing

#### Standalone

    npm test

or with code coverage

    npm run test:cov

#### From within Truffle

Run the `truffle` development environment

    truffle develop

then from the prompt you can run

    compile
    migrate
    test

as well as other Truffle commands. See [truffleframework.com](http://truffleframework.com) for more.

### Linting

We provide the following linting command for inspecting solidity contracts.

* `npm run lint:sol` — to lint the Solidity files, and

## Contributing

Please see the [contributing notes](CONTRIBUTING.md).
