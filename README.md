# selfkey-main-contracts

Smart contracts implementing core functionality of the SelfKey network.

* `develop` — [![codecov](https://codecov.io/gh/SelfKeyFoundation/selfkey-main-contracts/branch/develop/graph/badge.svg)](https://codecov.io/gh/SelfKeyFoundation/selfkey-main-contracts)
* `master` — [![codecov](https://codecov.io/gh/SelfKeyFoundation/selfkey-main-contracts/branch/master/graph/badge.svg)](https://codecov.io/gh/SelfKeyFoundation/selfkey-main-contracts)

## Overview

To date, there are 2 smart contracts implemented as part of the SelfKey main project:

* SelfKeyMain.sol
* PaymentSplitter.sol

### SelfKeyMain.sol

`SelfKeyMain` is designed to provide on-chain support for general functionality specific to the SelfKey
platform, such as affiliate and vendor registration. Also, it works as a central address directory that other
contracts or applications can query.

`SelfkeyMain` implements the `WhitelistedRole` pattern by OpenZeppelin. i.e. there are 2 permissioning levels:

* `WhitelistedAdmin`: can manage whitelisted addresses and execute methods with `onlyWhitelistAdmin` modifier.
* `Whitelisted`: can execute methods with `onlyWhitelisted` modifier.

Directory operations such as adding or changing addresses can be performed by `onlyWhitelistAdmin`. Methods for
managing vendors and affiliates can be executed by `onlyWhitelisted`.

This contract interacts with [SelfKey DID Ledger](https://github.com/SelfKeyFoundation/selfkey-did-ledger).

#### SelfKeyMain Method Interface

The following functions are implemented by the SelfKeyMain contract:

**As address directory:**

* `setAddress(bytes32 key, address _address)` (onlyWhitelistAdmin)
* `getAddress(bytes32 key)`

**Access management (onlyWhitelisted):**

* `registerAffiliate(bytes32 affiliateID)`
* `registerVendor(bytes32 vendorID)`
* `removeAffiliate(bytes32 affiliateID)`
* `removeVendor(bytes32 vendorID)`
* `addAffiliateConnection(bytes32 user, bytes32 affiliate) public onlyWhitelisted`
* `removeAffiliateConnection(bytes32 user) public onlyWhitelisted`

**DIDLedger middleware:**

* `createDID(bytes32 affiliateID) returns (bytes32)`
* `resolveDID(bytes32 did) returns (address)`

**Note:** Although transactions can be made directly on the DID Ledger, creating DIDs through the `SelfKeyMain`
serves the purpose of potential connecting to an affiliate, and this functionality might be improved to create
more complex identity setups (e.g. ERC725) before creating the DID on the ledger.

**This contract is planned to be upgradable via ZeppelinOS, yet the current version (1.0.0) still doesn't implement upgradability.**

### PaymentSplitter.sol

`PaymentSplitter` is a contract that receives a payment from a sender DID to a recipient DID. It checks for
possible affiliate relationships stored on the `SelfKeyMain` instance, and performs splitting of funds
according to percentages specified by the caller. _Service providers have to check if the payment and
affiliate splitting were done correctly_.

#### Payment pre-conditions

* Sender must `approve` the payments contract to spend the required amount of tokens.
* Sender, recipient and potential affiliates must have a valid DID registered on the DID Ledger.
* Recipient DID is registered as a _Vendor_ on the SelfKeyMain. (i.e. `vendorStatus(did) -> true`)
* Affiliates are registered as such on the SelfKeyMain. (i.e. `affiliateStatus(did) -> true`) and have a relationship to the sender DID (i.e. `affiliateConnections(senderDID) -> true`)

#### Payment method

Payments are done by invoking the `makePayment` method with the following parameters:

* `bytes32 senderDID`: DID of the sender. The contract checks that transaction sender has control over DID.
* `bytes32 recipientDID`: DID of the recipient. The contract checks that DID is registered as a Vendor.
* `uint256 amount`: amount of KEY tokens being sent.
* `bytes32 purchaseInfo`: 32 byte string describing the product/service and any other relevant info.
_NOTE: encoding scheme for purchase info hasn't been defined_
* `uint256 affiliate1Split`: percentage for affiliate level 1.
* `uint256 affiliate2Split`: percentage for affiliate level 2.

**Note**: Affiliate splitting percentages are not to be defined by the user, but should be pulled from a particular service (e.g. Airtable) by the client, and the payment recipient must verify this setup to prevent users from tampering with these parameters.

#### Example code

The following examples are using web3 1.0.x using async/await:

**Role registration**

```javascript
// whitelistedAdmin adds whitelisted address
await main.methods.addWhitelisted(whitelisted1).send({ 'from': admin1 })
console.log(await main.methods.isWhitelisted(whitelisted1).call()) // true

// register a DID as a Vendor
await main.methods.registerVendor(vendorDID).send({ 'from': whitelisted1 })
await main.methods.vendorStatus(vendorDID).call())  // true
```

**DID creation**:

```javascript
// user address calls main contract to create DID
let tx = await main.methods.createDID(zero).send({ 'from': user1 })
let did = tx.events.CreatedSelfKeyDID.returnValues.id
// verify newly created DID
console.log(ledger.methods.getController(did).call() == user1) // true
```

In the previous example, a 32-byte string of `zero` is passed as the _affiliateDID_, but can be used to link
the new DID to a valid (previously registered) affiliate:

```javascript
// create new DID for affiliate
let tx = await main.methods.createDID(zero).send({ 'from': affiliate1 })
let affiliate1DID = tx.events.CreatedSelfKeyDID.returnValues.id

// previously whitelisted address registers affiliate
await main.methods.registerAffiliate(affiliate1DID).send({ 'from': whitelisted1 })

// user creates new DID with affiliate connection
tx = await main.methods.createDID(affiliate1DID).send({ 'from': user2 })
let user2DID = tx.events.CreatedSelfKeyDID.returnValues.id
console.log(await main.methods.affiliateConnections(user2DID).call() == affiliate1DID) // true
```

**Payment**

```javascript
// approve payment contract to get amount of tokens from user address
await token.methods.approve(payments.address, 999999000000000000000000).send({ 'from': user1 })
await payments.methods.makePayment(
  tokenAddress,
  user1DID,     // bytes32 senderDID
  vendorDID,    // bytes32 recipientDID
  10000,        // uint256 amount
  info,         // bytes32 purchaseInfo
  0,            // uint256 affiliate1Split
  0,            // uint256 affiliate2Split
).send({ 'from': user1 })
```

## Development

Smart contracts are implemented using Solidity version `0.5.4`.

### Prerequisites

* [NodeJS](htps://nodejs.org), version 9.5+
* [truffle](http://truffleframework.com/), which is a comprehensive framework for Ethereum development. `npm install -g truffle` — this should install the latest truffle version.

### Initialization

    npm install

### Testing

Truffle testing requires a `ganache-cli` instance running. Some tests require more than 10 accounts, therefore
the number of accounts should be specified (e.g. run ganache with 12 generated accounts):

    ganache-cli -a 12

#### Standalone

    npm test

or with code coverage (doesn't require ganache)

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
