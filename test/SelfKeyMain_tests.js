const assertThrows = require("./utils/assertThrows")
const { getLog } = require("./utils/txHelpers")
const timeTravel = require("./utils/timeTravel")
const util = require("ethereumjs-util")

const DIDLedger = artifacts.require("./ledger/DIDLedger.sol")
const SelfKeyMain = artifacts.require("./SelfKeyMain.sol")
//const Token = artifacts.require("./mock/MockToken.sol")

contract("SelfKeyMain", accounts => {

  const [
    admin1,
    whitelisted1,
    vendor1,
    user1,
    user2,
    user3,
    affiliate1,
    affiliate2,
    affiliate3
  ] = accounts.slice(0)

  const zero = util.bufferToHex(util.setLengthLeft(0, 32))
  const ledgerKey = web3.utils.keccak256("DIDLedger")

  let ledger, main
  let affiliate1DID, affiliate2DID, affiliate3DID, user1DID, user2DID, user3DID, vendor1DID

  before(async () => {
    ledger = await DIDLedger.new()
    main = await SelfKeyMain.new()

    await main.addWhitelisted(whitelisted1, { from: admin1 })
  })

  context("SelfKeyMain methods", () => {
    it("set address to link with DIDLedger", async () => {
      // add DIDLedger address to SelfKeyMain
      await main.setAddress(ledgerKey, ledger.address, { from: admin1 })
      assert.equal(await main.getAddress(ledgerKey), ledger.address)
    })

    it("can create new DIDs on the ledger", async () => {
      let tx = await main.createDID(zero, { from: user1 })
      let log = getLog(tx, "CreatedSelfKeyDID")
      user1DID = log.args.id

      const controller = await main.resolveDID(user1DID)
      assert.equal(controller, user1)

      // create another DID to use it later
      tx = await main.createDID(zero, { from: affiliate3 })
      log = getLog(tx, "CreatedSelfKeyDID")
      affiliate3DID = log.args.id
    })

    it("(only) whitelisted can register affiliates (with valid DID)", async () => {
      // registers 2 affiliates
      let tx = await main.createDID(zero, { from: affiliate1 })
      let log = getLog(tx, "CreatedSelfKeyDID")
      affiliate1DID = log.args.id
      assert.equal(await main.resolveDID(affiliate1DID), affiliate1)

      tx = await main.createDID(zero, { from: affiliate2 })
      log = getLog(tx, "CreatedSelfKeyDID")
      affiliate2DID = log.args.id
      assert.equal(await main.resolveDID(affiliate2DID), affiliate2)

      await assertThrows(main.registerAffiliate(affiliate1DID, { from: admin1 }))
      await main.registerAffiliate(affiliate1DID, { from: whitelisted1 })
      assert.isTrue(await main.affiliateStatus(affiliate1DID))

      await assertThrows(main.registerAffiliate(zero, { from: whitelisted1 }))
      await main.registerAffiliate(affiliate2DID, { from: whitelisted1 })
      assert.isTrue(await main.affiliateStatus(affiliate2DID))

      await main.registerAffiliate(affiliate3DID, { from: whitelisted1 })
      assert.isTrue(await main.affiliateStatus(affiliate3DID))
    })

    it("whitelisted can register vendor (with valid DID)", async () => {
      let tx = await main.createDID(zero, { from: vendor1 })
      let log = getLog(tx, "CreatedSelfKeyDID")
      vendor1DID = log.args.id
      assert.equal(await main.resolveDID(vendor1DID), vendor1)

      await assertThrows(main.registerVendor(zero, { from: whitelisted1 }))
      await main.registerVendor(vendor1DID, { from: whitelisted1 })
      assert.isTrue(await main.vendorStatus(vendor1DID))
    })

    it("new DIDs can register with affiliate link", async () => {
      // user2 registers as a DID with affiliate link
      let tx = await main.createDID(affiliate1DID, { from: user2 })
      let log = getLog(tx, "CreatedSelfKeyDID")
      user2DID = log.args.id

      assert.equal(await main.resolveDID(user2DID), user2)
      assert.equal(await main.affiliateLinks(user2DID), affiliate1DID)
    })

    it("unauthorized DIDs cannot be used as affiliates (affiliate DID is ignored)", async () => {
      let tx = await main.createDID(user1DID, { from: user3 })
      let log = getLog(tx, "CreatedSelfKeyDID")
      user3DID = log.args.id

      assert.equal(await main.resolveDID(user3DID), user3)
      assert.equal(await main.affiliateLinks(user3DID), zero)

      //
    })

    it("authorized affiliates are ignored if their DID was deleted on the ledger", async () => {
      assert.isTrue(await main.affiliateStatus(affiliate3DID))
      await ledger.deleteDID(affiliate3DID, { from: affiliate3 })
      assert.isTrue(await main.affiliateStatus(affiliate3DID))

      let tx = await main.createDID(affiliate3DID, { from: user3 })
      let log = getLog(tx, "CreatedSelfKeyDID")
      const someDID = log.args.id

      assert.equal(await main.resolveDID(someDID), user3)
      assert.equal(await main.affiliateLinks(someDID), zero)  // affiliate link was ignored
    })

    it("(only) whitelisted can remove vendors", async () => {
      assert.isTrue(await main.vendorStatus(vendor1DID))
      await assertThrows(main.removeVendor(vendor1DID, { from: user1 }))
      await main.removeVendor(vendor1DID, { from: whitelisted1 })
      assert.isFalse(await main.vendorStatus(vendor1DID))
    })

    it("(only) whitelisted can remove affiliates", async () => {
      assert.isTrue(await main.affiliateStatus(affiliate1DID))
      await assertThrows(main.removeAffiliate(affiliate1DID, { from: user1 }))
      await main.removeAffiliate(affiliate1DID, { from: whitelisted1 })
      assert.isFalse(await main.affiliateStatus(affiliate1DID))
    })

    it("(only) whitelisted can arbitrarily link existing DIDs to affiliates (with valid DID)", async () => {
      const anyHash = web3.utils.keccak256("Vitalik")
      assert.equal(await main.affiliateLinks(user3DID), zero)
      await assertThrows(main.addAffiliateLink(user3DID, affiliate2DID, { from: user1 }))
      await assertThrows(main.addAffiliateLink(user3DID, anyHash, { from: whitelisted1 }))
      await main.addAffiliateLink(user3DID, affiliate2DID, { from: whitelisted1 })
      assert.equal(await main.affiliateLinks(user3DID), affiliate2DID)
    })

    it("(only) whitelisted can remove affiliate links", async () => {
      assert.equal(await main.affiliateLinks(user3DID), affiliate2DID)
      await assertThrows(main.removeAffiliateLink(user3DID, { from: user1 }))
      await main.removeAffiliateLink(user3DID, { from: whitelisted1 })
      assert.equal(await main.affiliateLinks(user3DID), zero)
    })

    it("DID owners can set metadata on the ledger", async () => {
      const someHash = web3.utils.keccak256("TYPE-ERC725")
      await ledger.setMetadata(user3DID, someHash, { from: user3 })
    })
  })
})
