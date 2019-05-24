const SelfKeyMain = artifacts.require("SelfKeyMain")

module.exports = function(deployer) {
  deployer.deploy(SelfKeyMain)
}
