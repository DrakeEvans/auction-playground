// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "hardhat/console.sol";

contract Auction is Ownable {
    address public paymentToken;
    address public auctionLibrary;
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
}
