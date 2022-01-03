// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "hardhat/console.sol";

contract Auction is Ownable {
    using SafeMath for uint256;
    using ECDSA for bytes32;

    address public paymentToken;
    uint256 public minimumBid;
    uint256 public minimumTickSize;
    address public prizeContract;
    uint256 public prizeId;
    address public auctionOwner;
    uint256 public createdOn;

    struct Bid {
        uint256 timestamp;
        uint256 amount;
        address bidder;
        address recipient;
    }

    Bid[] public bids;

    mapping(address => uint256) public addressToLockedAmount;

    address public auctionLibrary;

    constructor(address _auctionLibrary) Ownable() {
        auctionLibrary = _auctionLibrary;
        createdOn = block.timestamp;
    }

    function initialize(
        address _auctionOwner,
        address _paymentToken,
        uint256 _minimumTickSize,
        address _prizeContract,
        uint256 _prizeId,
        uint256 _minimumBid
    ) public onlyOwner {
        auctionOwner = _auctionOwner;
        paymentToken = _paymentToken;
        minimumTickSize = _minimumTickSize;
        prizeContract = _prizeContract;
        prizeId = _prizeId;
        minimumBid = _minimumBid;
    }

    function bid(uint256 _bidAmount) external {
        (bool _success, bytes memory _returnData) = auctionLibrary.delegatecall(
            abi.encodeWithSignature("bid(uint256)", _bidAmount)
        );

        if (_success == false) {
            if (_returnData.length > 0) {
                assembly {
                    let returndata_size := mload(_returnData)
                    revert(add(32, _returnData), returndata_size)
                }
            } else {
                revert("bid(uint256): delegatecall reverted");
            }
        }
    }

    function bid(
        uint256 _bidAmount,
        address _recipient,
        bytes memory _signedMessage
    ) external {
        (bool _success, bytes memory _returnData) = auctionLibrary.delegatecall(
            abi.encodeWithSignature("bid(uint256,address,bytes)", _bidAmount, _recipient, _signedMessage)
        );

        if (_success == false) {
            if (_returnData.length > 0) {
                assembly {
                    let returndata_size := mload(_returnData)
                    revert(add(32, _returnData), returndata_size)
                }
            } else {
                revert("bid(uint256,address,bytes): delegatecall reverted");
            }
        }
    }
}
