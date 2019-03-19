pragma solidity ^0.5.4;

import './AddressDirectory.sol';

/**
 * @title SelfKeyContract
 * @dev Includes a reference to Selfkey directory and other relevant contracts
 */
contract SelfKeyContract {

    AddressDirectory public directory;

    function setDirectory(address _directory)
        internal
    {
        directory = AddressDirectory(_directory);
    }
}
