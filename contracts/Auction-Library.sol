// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./Prize-Manager.sol";
import "hardhat/console.sol";

contract AuctionLibrary is Ownable, PrizeManager, ReentrancyGuard {
    using SafeMath for uint256; // built in to solidity >0.8 but just wanted to play around
    using ECDSA for bytes32;

    address public paymentToken;
    uint256 public minimumBid;
    uint256 public minimumTickSize;
    Prize[] public prizes;
    address public auctionOwner;
    uint256 public createdOn;
    bool public isAuctionActive;
    bool public ownerSettled;
    bool public winnerSettled;

    struct Bid {
        uint256 timestamp;
        uint256 amount;
        address bidder;
        address recipient;
    }

    Bid[] public bids;

    mapping(address => uint256) public addressToLockedAmount;

    modifier onlyActiveAuction() {
        require(isAuctionActive, "Auction is not active");
        if (bids.length > 0 && block.timestamp.sub(bids[bids.length - 1].timestamp) > 15 * 60) {
            revert("Auction is over");
        }
        _;
    }

    function _bidBase(uint256 _bidAmount, address _recipient) private {
        if (bids.length > 0) {
            // gas savings
            Bid storage lastBid = bids[bids.length - 1];

            // check if bid increment is enough
            require(_bidAmount > lastBid.amount, "New bid must be higher than old bid");
            require(
                _bidAmount.sub(lastBid.amount) >= minimumTickSize,
                "Bid does not meet minimum tick size, bid higher"
            );
        }

        //check if bid above minimum
        require(_bidAmount > minimumBid, "Bid not above minimum bid size");

        //check if transfer works
        uint256 _amountLocked = addressToLockedAmount[msg.sender];
        require(_bidAmount >= _amountLocked, "Cannot bid lower than you previously bid");

        addressToLockedAmount[msg.sender] = _bidAmount;

        uint256 _amountToTransfer = _bidAmount.sub(_amountLocked);
        bool _sendERC20 = IERC20(paymentToken).transferFrom(msg.sender, address(this), _amountToTransfer);
        require(_sendERC20, "Transfer of bid amount failed");
        bids.push(Bid({ timestamp: block.timestamp, amount: _bidAmount, bidder: msg.sender, recipient: _recipient }));
    }

    function bid(uint256 _bidAmount) external {
        _bidBase(_bidAmount, msg.sender);
    }

    function bid(
        uint256 _bidAmount,
        address _recipient,
        bytes memory _signedMessage
    ) external onlyActiveAuction {
        //Check signature
        require(
            bytes32(keccak256(abi.encodePacked(address(this)))).toEthSignedMessageHash().recover(_signedMessage) ==
                _recipient,
            "Signed message not valid"
        );

        _bidBase(_bidAmount, _recipient);
    }

    function endAuction() public onlyOwner {
        uint256 _bidsLength = bids.length;
        require(_bidsLength > 0, "Only able to end the auction when at least one bid has been placed");
        if (_bidsLength > 1) {
            Bid storage lastBid = bids[bids.length - 1];
            (bool _safe, uint256 _value) = lastBid.amount.tryMul(5);
            require(block.timestamp.sub(lastBid.timestamp) <= 15 * 60, "Auction is already over");
            require(_safe, "math overflow or underflow");
            require(
                _value >= bids[_bidsLength - 2].amount,
                "To end auction manually, last bid must be at least 5x previous"
            );
        } else {
            revert("not enough bids to end early");
        }
        isAuctionActive = false;
    }

    function ownerSettle() public {
        require(!ownerSettled, "Owner can settle only once");
        require(bids.length > 0, "Auction has not started");
        ownerSettled = true;
        Bid storage lastBid = bids[bids.length - 1];
        addressToLockedAmount[lastBid.bidder] = 0;
        require(!isAuctionActive || block.timestamp.sub(lastBid.timestamp) >= 15 * 60, "Auction is not over");
        if (isAuctionActive == true) isAuctionActive = false;
        bool _sendERC20 = IERC20(paymentToken).transfer(owner(), lastBid.amount);
        require(_sendERC20, "Transfer of winning amount failed");
    }

    function winnerSettle() public {
        require(!winnerSettled, "Winner can only settle only once");
        require(bids.length > 0, "Auction has not started");
        winnerSettled = true;
        Bid storage lastBid = bids[bids.length - 1];
        require(!isAuctionActive || block.timestamp.sub(lastBid.timestamp) >= 15 * 60, "Auction is not over");
        if (isAuctionActive == true) isAuctionActive = false;
        transferPrizes(address(this), lastBid.recipient, prizes);
    }

    function returnFunds(address _to) public {
        Bid storage lastBid = bids[bids.length - 1];
        address _lastBidder = lastBid.bidder;
        require(_lastBidder != _to, "Funds cannot be returned to the highest bidder");
        uint256 _amountLocked = addressToLockedAmount[_to];
        require(_amountLocked > 0, "No funds are locked");
        addressToLockedAmount[_to] = 0;
        bool _sendERC20 = IERC20(paymentToken).transfer(_lastBidder, lastBid.amount);
        require(_sendERC20, "Transfer of locked bid amount failed");
    }
}
