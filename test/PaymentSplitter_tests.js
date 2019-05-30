const assertThrows = require("./utils/assertThrows")
const { getLog } = require("./utils/txHelpers")
const timeTravel = require("./utils/timeTravel")
const util = require("ethereumjs-util")

const DIDLedger = artifacts.require("./ledger/DIDLedger.sol")
const SelfKeyMain = artifacts.require("./SelfKeyMain.sol")
const PaymentSplitter = artifacts.require("./PaymentSplitter.sol")
const Token = artifacts.require("./mock/MockToken.sol")

contract("PaymentSplitter", accounts => {
  //const now = new Date().getTime() / 1000
  const [
    admin1,
    admin2,
    whitelisted1,
    vendor,
    vendor2,
    user1,
    user2,
    user3,
    affiliate1,
    affiliate2,
    affiliate3
  ] = accounts.slice(0)

  const zero = util.bufferToHex(util.setLengthLeft(0, 32))
  const info = util.bufferToHex(util.setLengthLeft(999999, 32))

  const ledgerKey = web3.utils.keccak256("DIDLedger")

  let ledger, main, payments, token
  let user1DID, user2DID, user3DID, affiliate1DID, affiliate2DID, affiliate3DID, vendorDID, vendor2DID

  before(async () => {
    token = await Token.new()
    await token.freeMoney(user1, 15000)

    ledger = await DIDLedger.new()
    main = await SelfKeyMain.new()
    payments = await PaymentSplitter.new(main.address)

    await main.setAddress(ledgerKey, ledger.address, { from: admin1 })
    await main.addWhitelisted(whitelisted1, { from: admin1 })

    // Registers DIDs
    let tx = await ledger.createDID(zero, { from: user1 })
    let log = getLog(tx, "CreatedDID")
    user1DID = log.args.id

    tx = await ledger.createDID(zero, { from: user2 })
    log = getLog(tx, "CreatedDID")
    user2DID = log.args.id

    tx = await ledger.createDID(zero, { from: user3 })
    log = getLog(tx, "CreatedDID")
    user3DID = log.args.id

    tx = await ledger.createDID(zero, { from: user3 })
    log = getLog(tx, "CreatedDID")
    user3DID2 = log.args.id

    tx = await ledger.createDID(zero, { from: vendor })
    log = getLog(tx, "CreatedDID")
    vendorDID = log.args.id

    tx = await ledger.createDID(zero, { from: vendor2 })
    log = getLog(tx, "CreatedDID")
    vendor2DID = log.args.id

    tx = await ledger.createDID(zero, { from: affiliate1 })
    log = getLog(tx, "CreatedDID")
    affiliate1DID = log.args.id

    tx = await ledger.createDID(zero, { from: affiliate2 })
    log = getLog(tx, "CreatedDID")
    affiliate2DID = log.args.id

    tx = await ledger.createDID(zero, { from: affiliate3 })
    log = getLog(tx, "CreatedDID")
    affiliate3DID = log.args.id

    //Register affiliates and vendors
    await main.registerVendor(vendorDID, { from: whitelisted1 })
    await main.registerVendor(vendor2DID, { from: whitelisted1 })
    await main.registerAffiliate(affiliate1DID, { from: whitelisted1 })
    await main.registerAffiliate(affiliate2DID, { from: whitelisted1 })
    await main.registerAffiliate(affiliate3DID, { from: whitelisted1 })
    await main.addAffiliateConnection(user2DID, affiliate1DID, { from: whitelisted1 })
    await main.addAffiliateConnection(affiliate1DID, affiliate2DID, { from: whitelisted1 })
    await main.addAffiliateConnection(user3DID, affiliate3DID, { from: whitelisted1 })

    await token.approve(payments.address, 15000, { from: user1 })
  })

  context("Split payment", () => {
    it("cannot send from a DID not under control", async () => {
      await assertThrows(
        payments.makePayment(
          token.address,
          user2DID,     // bytes32 senderDID
          vendorDID,    // bytes32 recipientDID
          10000,        // uint256 amount
          info,         // bytes32 purchaseInfo
          0,           // uint256 affiliate1Split
          0,            // uint256 affiliate2Split
          { from: user1 }
        )
      )
    })

    it("cannot make payment to an invalid vendor DID", async () => {
      await assertThrows(
        payments.makePayment(
          token.address,
          user1DID,     // bytes32 senderDID
          user2DID,    // bytes32 recipientDID (not a registered vendor)
          10000,        // uint256 amount
          info,         // bytes32 purchaseInfo
          0,           // uint256 affiliate1Split
          0,            // uint256 affiliate2Split
          { from: user1 }
        )
      )
    })

    it("cannot make payment to an invalid vendor DID", async () => {
      await assertThrows(
        payments.makePayment(
          token.address,
          user1DID,     // bytes32 senderDID
          user2DID,    // bytes32 recipientDID (not a registered vendor)
          10000,        // uint256 amount
          info,         // bytes32 purchaseInfo
          0,           // uint256 affiliate1Split
          0,            // uint256 affiliate2Split
          { from: user1 }
        )
      )
    })

    it("cannot make payment to a vendor that deleted his DID on the ledger", async () => {
      await ledger.deleteDID(vendor2DID, { from: vendor2 })
      assert.equal(await ledger.getController(vendor2DID), 0)
      await assertThrows(
        payments.makePayment(
          token.address,
          user1DID,     // bytes32 senderDID
          vendor2DID,    // bytes32 recipientDID (not a registered vendor)
          10000,        // uint256 amount
          info,         // bytes32 purchaseInfo
          0,           // uint256 affiliate1Split
          0,            // uint256 affiliate2Split
          { from: user1 }
        )
      )
    })

    it("user without affiliates makes a payment", async () => {
      // make two different payments
      await payments.makePayment(
        token.address,
        user1DID,     // bytes32 senderDID
        vendorDID,    // bytes32 recipientDID
        10000,        // uint256 amount
        info,         // bytes32 purchaseInfo
        10,           // uint256 affiliate1Split (should be ignored)
        5,            // uint256 affiliate2Split (should be ignored)
        { from: user1 }
      )
      assert.equal(await token.balanceOf(user1), 5000)
      assert.equal(await token.balanceOf(vendor), 10000)
      assert.equal(await token.balanceOf(payments.address), 0)
    })

    it("level 1 affiliate gets paid", async () => {
      await token.freeMoney(user3, 1000)
      await token.approve(payments.address, 1000, { from: user3 })

      await payments.makePayment(
        token.address,
        user3DID,     // bytes32 senderDID
        vendorDID,    // bytes32 recipientDID
        1000,         // uint256 amount
        info,         // bytes32 purchaseInfo
        15,           // uint256 affiliate1Split
        50,           // uint256 affiliate2Split   (should be ignored)
        { from: user3 }
      )

      assert.equal(await token.balanceOf(user3), 0)
      assert.equal(await token.balanceOf(payments.address), 0)
      assert.equal(await token.balanceOf(affiliate3), 150)
      assert.equal(await token.balanceOf(vendor), 10850)
    })

    it("level 2 affiliate gets paid", async () => {
      await token.freeMoney(user2, 10000)
      await token.approve(payments.address, 10000, { from: user2 })

      await payments.makePayment(
        token.address,
        user2DID,     // bytes32 senderDID
        vendorDID,    // bytes32 recipientDID
        10000,        // uint256 amount
        info,         // bytes32 purchaseInfo
        10,           // uint256 affiliate1Split
        5,            // uint256 affiliate2Split
        { from: user2 }
      )
      assert.equal(await token.balanceOf(user2), 0)
      assert.equal(await token.balanceOf(affiliate1), 1000)
      assert.equal(await token.balanceOf(affiliate2), 500)
      assert.equal(await token.balanceOf(vendor), 19350)
    })
  })
})
