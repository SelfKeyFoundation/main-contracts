pragma solidity ^0.5.4;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title AddressDirectory
 * @dev Main directory for SelfKey related addresses
 */
contract AddressDirectory is Ownable {

    uint8 public constant TYPE_ACCOUNT = 0;
    uint8 public constant TYPE_ERC725 = 1;

    mapping(bytes32 => address) public addresses;

    event AddressSet(address sender, bytes32 key, address _address);

    function setAddress(bytes32 key, address _address)
        public
        onlyOwner
    {
        addresses[key] = address;
    }

    function getAddress(bytes32 key)
        public
        returns (address)
    {
        return addresses[key];
    }
}
