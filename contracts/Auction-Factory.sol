// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Auction.sol";

contract AuctionFactory is Ownable {
    address public auctionLibrary;

    constructor(address _auctionLibrary) Ownable() {
        auctionLibrary = _auctionLibrary;
    }

    event NewAuction(address indexed owner, address indexed auctionAddress);

    function createAuction(
        address _auctionOwner,
        address _paymentToken,
        uint256 _minimumTickSize,
        address _prizeContract,
        uint256 _prizeId
    ) external returns (address) {
        Auction _auction = new Auction(auctionLibrary);
        _auction.initialize(_auctionOwner, _paymentToken, _minimumTickSize, _prizeContract, _prizeId, 0);

        IERC721(_prizeContract).transferFrom(_auctionOwner, address(this), _prizeId);

        emit NewAuction(msg.sender, address(_auction));

        return address(_auction);
    }

    // overloaded with minimum bid size
    function createAuction(
        address _auctionOwner,
        address _paymentToken,
        uint256 _minimumTickSize,
        address _prizeContract,
        uint256 _prizeId,
        uint256 _minimumBid
    ) external returns (address) {
        Auction _auction = new Auction(auctionLibrary);
        _auction.initialize(_auctionOwner, _paymentToken, _minimumTickSize, _prizeContract, _prizeId, _minimumBid);

        IERC721(_prizeContract).transferFrom(_auctionOwner, address(this), _prizeId);

        emit NewAuction(msg.sender, address(_auction));

        return address(_auction);
    }
}
