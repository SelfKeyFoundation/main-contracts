const DIDLedger = artifacts.require("DIDLedger")
//const SelfKeyMain = artifacts.require("SelfKeyMain");

module.exports = function(deployer) {
  deployer.deploy(DIDLedger)
}
