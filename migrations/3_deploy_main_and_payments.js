const SelfKeyMain = artifacts.require("SelfKeyMain")
const PaymentSplitter = artifacts.require("PaymentSplitter")

module.exports = function(deployer) {
  deployer.deploy(SelfKeyMain).then(() => {
    return deployer.deploy(PaymentSplitter, SelfKeyMain.address)
  })
}
