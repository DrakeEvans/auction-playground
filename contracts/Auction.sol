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

contract Auction is Ownable, PrizeManager, ReentrancyGuard {
    using SafeMath for uint256;
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

    address public auctionLibrary;

    modifier onlyActiveAuction() {
        require(isAuctionActive, "Auction is not active");
        if (bids.length > 0 && block.timestamp.sub(bids[bids.length - 1].timestamp) > 15 * 60) {
            revert("Auction is over");
        }
        _;
    }

    constructor(address _auctionLibrary) Ownable() {
        auctionLibrary = _auctionLibrary;
        createdOn = block.timestamp;
        isAuctionActive = true;
    }

    function initialize(
        address _auctionOwner,
        address _paymentToken,
        uint256 _minimumTickSize,
        Prize[] memory _prizes,
        uint256 _minimumBid
    ) public onlyOwner {
        auctionOwner = _auctionOwner;
        paymentToken = _paymentToken;
        minimumTickSize = _minimumTickSize;
        minimumBid = _minimumBid;
        transferOwnership(_auctionOwner);
        for (uint256 i = 0; i < _prizes.length; i++) {
            prizes.push(_prizes[i]);
        }
    }

    function bubbleUpRevertMessage(bool _success, bytes memory _returnData) private pure {
        if (_success == false) {
            if (_returnData.length > 0) {
                assembly {
                    let returndata_size := mload(_returnData)
                    revert(add(32, _returnData), returndata_size)
                }
            } else {
                revert("unable to bubble up revert message");
            }
        }
    }

    function bid(uint256 _bidAmount) external onlyActiveAuction nonReentrant {
        (bool _success, bytes memory _returnData) = auctionLibrary.delegatecall(
            abi.encodeWithSignature("bid(uint256)", _bidAmount)
        );

        bubbleUpRevertMessage(_success, _returnData);
    }

    function bid(
        uint256 _bidAmount,
        address _recipient,
        bytes memory _signedMessage
    ) external onlyActiveAuction nonReentrant {
        (bool _success, bytes memory _returnData) = auctionLibrary.delegatecall(
            abi.encodeWithSignature("bid(uint256,address,bytes)", _bidAmount, _recipient, _signedMessage)
        );

        bubbleUpRevertMessage(_success, _returnData);
    }

    function endAuction() public onlyOwner {
        (bool _success, bytes memory _returnData) = auctionLibrary.delegatecall(
            abi.encodeWithSignature("endAuction()")
        );

        bubbleUpRevertMessage(_success, _returnData);
    }

    function ownerSettle() public {
        (bool _success, bytes memory _returnData) = auctionLibrary.delegatecall(
            abi.encodeWithSignature("ownerSettle()")
        );

        bubbleUpRevertMessage(_success, _returnData);
    }

    function winnerSettle() public {
        (bool _success, bytes memory _returnData) = auctionLibrary.delegatecall(
            abi.encodeWithSignature("winnerSettle()")
        );

        bubbleUpRevertMessage(_success, _returnData);
    }

    function returnFunds(address _to) public {
        (bool _success, bytes memory _returnData) = auctionLibrary.delegatecall(
            abi.encodeWithSignature("returnFunds(addres)", _to)
        );

        bubbleUpRevertMessage(_success, _returnData);
    }
}
