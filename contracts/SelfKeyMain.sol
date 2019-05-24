pragma solidity 0.5.4;

import "./ledger/DIDLedger.sol";
import "openzeppelin-solidity/contracts/access/roles/WhitelistedRole.sol";

/**
 * @title SelfKeyMain
 * @dev Main entrypoint implementing SelfKey platform functionality
 */
contract SelfKeyMain is WhitelistedRole {
    //bytes32 constant TYPE_ERC725 = keccak256(abi.encodePacked("ERC725"));
    bytes32 constant LEDGER_KEY = keccak256(abi.encodePacked("DIDLedger"));

    // directory
    mapping(bytes32 => address) public addresses;
    //DIDLedger public ledger;

    mapping(bytes32 => bytes32) public affiliateLinks;
    mapping(bytes32 => bool) public affiliateStatus;
    mapping(bytes32 => bool) public vendorStatus;

    event RegisteredAffiliate(bytes32 id);
    event RegisteredVendor(bytes32 id);
    event RemovedAffiliate(bytes32 id);
    event RemovedVendor(bytes32 id);
    event RegisteredSelfKeyDID(bytes32 id);
    event AddedAffiliateLink(bytes32 user, bytes32 affiliate);
    event RemovedAffiliateLink(bytes32 user, bytes32 affiliate);
    event CreatedSelfKeyDID(bytes32 id, bytes32 affiliate);
    event SetAddress(bytes32 key, address _address);

    function setAddress(bytes32 key, address _address)
        public
        onlyWhitelistAdmin
    {
        addresses[key] = _address;
        emit SetAddress(key, _address);
    }

    function getAddress(bytes32 key)
        public
        view
        returns (address)
    {
        return addresses[key];
    }

    function registerAffiliate(bytes32 affiliateID)
        public
        onlyWhitelisted
    {
        DIDLedger ledger = DIDLedger(getAddress(LEDGER_KEY));
        require(ledger.getController(affiliateID) != address(0), "DID is not registered on the ledger");

        affiliateStatus[affiliateID] = true;
        emit RegisteredAffiliate(affiliateID);
    }

    function registerVendor(bytes32 vendorID)
        public
        onlyWhitelisted
    {
        DIDLedger ledger = DIDLedger(getAddress(LEDGER_KEY));
        require(ledger.getController(vendorID) != address(0), "DID is not registered on the ledger");

        vendorStatus[vendorID] = true;
        emit RegisteredVendor(vendorID);
    }

    function addAffiliateLink(bytes32 user, bytes32 affiliate)
        public
        onlyWhitelisted
    {
        require(affiliateStatus[affiliate], "DID provided is not listed as affiliate");
        affiliateLinks[user] = affiliate;
        emit AddedAffiliateLink(user, affiliate);
    }

    function removeAffiliate(bytes32 affiliateID)
        public
        onlyWhitelisted
    {
        affiliateStatus[affiliateID] = false;
        emit RemovedAffiliate(affiliateID);
    }

    function removeVendor(bytes32 vendorID)
        public
        onlyWhitelisted
    {
        vendorStatus[vendorID] = false;
        emit RemovedVendor(vendorID);
    }

    function removeAffiliateLink(bytes32 user)
        public
        onlyWhitelisted
    {
        bytes32 affiliate = affiliateLinks[user];
        affiliateLinks[user] = bytes32(0);
        emit RemovedAffiliateLink(user, affiliate);
    }

    function createDID(bytes32 affiliateID)
        public
        returns (bytes32)
    {
        DIDLedger ledger = DIDLedger(getAddress(LEDGER_KEY));
        bytes32 newDID = ledger.createDID(bytes32(0));

        if (affiliateStatus[affiliateID] && ledger.getController(affiliateID) != address(0)) {
            affiliateLinks[newDID] = affiliateID;
        }

        // transfer DID ownership to user
        ledger.setController(newDID, msg.sender);
        emit CreatedSelfKeyDID(newDID, affiliateID);
        return newDID;
    }

    function resolveDID(bytes32 did)
        public
        view
        returns (address)
    {
        DIDLedger ledger = DIDLedger(getAddress(LEDGER_KEY));
        return ledger.getController(did);
    }
}
