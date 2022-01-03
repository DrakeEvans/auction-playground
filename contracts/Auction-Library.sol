// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "hardhat/console.sol";

contract AuctionLibrary is Ownable {
    using SafeMath for uint256;
    using ECDSA for bytes32;

    address public paymentToken;
    uint256 public minimumBid;
    uint256 public minimumTickSize;
    address public prizeContract;
    uint256 public prizeId;

    struct Bid {
        uint256 timestamp;
        uint256 amount;
        address bidder;
        address recipient;
    }

    Bid[] public bids;

    mapping(address => uint256) public addressToLockedAmount;

    function bid(
        uint256 _bidAmount,
        address _recipient,
        bytes memory _signedMessage
    ) external {
        //check if bid above minimum
        require(_bidAmount > minimumBid, "Bid not above minimum bid size");

        //check if bid increment is enough
        Bid storage lastBid = bids[bids.length];
        require(
            _bidAmount.sub(lastBid.amount) >= minimumTickSize,
            "Bid is does not meet minimum tick size, bid higher"
        );

        //check if transfer works
        uint256 _amountToTransfer = _bidAmount.sub(addressToLockedAmount[msg.sender]);
        bool _sendERC20 = IERC20(prizeContract).transferFrom(msg.sender, address(this), _amountToTransfer);
        require(_sendERC20, "Transfer of bid amount failed");
        addressToLockedAmount[msg.sender] = _bidAmount;

        //Check signature
        require(
            bytes32("permissionGranted").toEthSignedMessageHash().recover(_signedMessage) == _recipient,
            "Signed message not valid"
        );

        bids.push(Bid({ timestamp: block.timestamp, amount: _bidAmount, bidder: msg.sender, recipient: _recipient }));
    }
}
