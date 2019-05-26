pragma solidity 0.5.4;

import "./SelfKeyMain.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

/**
 *  Contract that handles splitting of payments for affiliate fees
 */
contract PaymentSplitter {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    SelfKeyMain public main;

    event AffiliateCommissionPaid(
        address recipient,
        bytes32 recipientDID,
        uint256 amount
    );
    event PaymentExecuted(
        bytes32 sender,
        bytes32 recipient,
        uint256 amount,
        bytes32 purchaseInfo
    );

    constructor(address _main) public {
        main = SelfKeyMain(_main);
    }

    /**
     *  Make a payment to a recipient address with escrow and two level affiliate splitting
     */
    function makePayment(
        address _token,
        bytes32 senderDID,
        bytes32 recipientDID,
        uint256 amount,
        bytes32 purchaseInfo,
        uint256 affiliate1Split,
        uint256 affiliate2Split
    )
        public
        returns (uint256)
    {
        IERC20 token = IERC20(_token);  // SelfkeyToken contract
        require(main.vendorStatus(recipientDID), "Recipient DID is not registered as vendor");

        address recipientAddress = main.resolveDID(recipientDID);
        require(recipientAddress != address(0), "Invalid recipient DID");

        address senderAddress = main.resolveDID(senderDID);
        require(senderAddress == msg.sender, "Sender has no control over provided DID");

        token.safeTransferFrom(msg.sender, address(this), amount);

        uint256 affiliate1Amount = (amount.mul(affiliate1Split)).div(100);
        uint256 affiliate2Amount = (amount.mul(affiliate2Split)).div(100);
        uint256 vendorAmount = amount;

        bytes32 affiliate1 = main.affiliateLinks(senderDID);
        address affiliate1Address = resolveAffiliate(affiliate1);

        if (affiliate1Address != address(0)) {
            vendorAmount = vendorAmount.sub(affiliate1Amount);
            token.safeTransfer(affiliate1Address, affiliate1Amount);
            emit AffiliateCommissionPaid(affiliate1Address, affiliate1, affiliate1Amount);

            bytes32 affiliate2 = main.affiliateLinks(affiliate1);
            address affiliate2Address = resolveAffiliate(affiliate2);

            if (affiliate2Address != address(0)) {
                vendorAmount = vendorAmount.sub(affiliate2Amount);
                token.safeTransfer(affiliate2Address, affiliate2Amount);
                emit AffiliateCommissionPaid(affiliate2Address, affiliate2, affiliate2Amount);
            }
        }

        token.safeTransfer(recipientAddress, vendorAmount);

        emit PaymentExecuted(senderDID, recipientDID, amount, purchaseInfo);
    }

    function resolveAffiliate(bytes32 did)
        internal
        view
        returns (address)
    {
        if (did == bytes32(0) || !main.affiliateStatus(did)) {
            return address(0);
        } else {
            return main.resolveDID(did);
        }
    }
}
