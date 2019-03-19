pragma solidity ^0.5.4;

import './erc725/IdentityProxy.sol';
import './DIDLedger.sol';
import "zos-lib/contracts/Initializable.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/access/roles/WhitelistAdminRole.sol";

/**
 * @title SelfKeyMain
 * @dev Main entrypoint implementing SelfKey platform functionality
 */
contract SefKeyMain is SelfKeyContract, Initializable, WhitelistAdminRole {
    // NOTE: What happens if one of the admin accounts is compromised? (no one can remove from whitelist)

    uint128 public constant TYPE_ACCOUNT = 0;
    uint128 public constant TYPE_ERC725 = 1;
    // Add other types

    mapping(address => address) public affiliateLinks;
    mapping(address => bool) public affiliateStatus;
    mapping(address => bool) public vendorStatus;

    event IdentityRegistered(address sender, address idContract);

    function initialize(address _directory)
        public
    {
        setDirectory(_directory);
    }

    function registerAffiliate()
        public
        onlyWhitelistAdmin
    {
        affiliateStatus[msg.sender] = true;     //change to payout address instead of boolean
    }

    function registerVendor()
        public
        onlyWhitelistAdmin
    {
        vendorStatus[msg.sender] = true;
    }

    function removeAffiliate()
        public
        onlyWhitelistAdmin
    {
        affiliateStatus[msg.sender] = false;
    }

    function removeVendor()
        public
        onlyWhitelistAdmin
    {
        vendorStatus[msg.sender] = false;
    }

    function registerIdentity(uint256 contractType, address affiliate)
        public
        returns (address)
    {
        IdentityLedger ledger = IdentityLedger(directory.getAddress("IdentityLedger"));
        address newIdentity = msg.sender;

        // deploy ERC725 instance if needed
        // NOTE: What happens if same address deploys multiple erc725 instances???????
        if(contractType == 1) {
            IdentityProxy erc725 = new IdentityProxy(msg.sender);
            newIdentity = address(erc725);
        }

        ledger.create(newIdentity, bytes32(0)); // initialize with data?????

        if(affiliate != address(0)) {
            if(affiliateStatus[affiliate]){
                affiliateLinks[newId] = affiliate;
            } else {
                revert("Affiliate address provided is not an affiliate");
            }
        }

        emit IdentityCreated(msg.sender, newIdentity);
        return newIdentity;
    }
}
