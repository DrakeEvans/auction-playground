// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "./Auction.sol";
import "./Prize-Manager.sol";

contract AuctionFactory is Ownable, PrizeManager {
    address public auctionLibrary;

    constructor(address _auctionLibrary) Ownable() {
        auctionLibrary = _auctionLibrary;
    }

    event NewAuction(address indexed owner, address indexed auctionAddress);

    function createAuction(
        address _auctionOwner,
        address _paymentToken,
        uint256 _minimumTickSize,
        Prize[] memory _prizes,
        uint256 _minimumBid
    ) public returns (address) {
        Auction _auction = new Auction(auctionLibrary);

        _auction.initialize(_auctionOwner, _paymentToken, _minimumTickSize, _prizes, _minimumBid);

        transferPrizes(_auctionOwner, address(_auction), _prizes);

        emit NewAuction(_auctionOwner, address(_auction));

        return address(_auction);
    }

    // overloaded without minumum bid
    function createAuction(
        address _auctionOwner,
        address _paymentToken,
        uint256 _minimumTickSize,
        Prize[] memory _prizes
    ) public returns (address) {
        return this.createAuction(_auctionOwner, _paymentToken, _minimumTickSize, _prizes, 0);
    }

    // Marked for deprecation
    function createAuction(
        address _auctionOwner,
        address _paymentToken,
        uint256 _minimumTickSize,
        address _prizeContract,
        uint256 _prizeId,
        uint256 _minimumBid
    ) public returns (address) {
        Prize[] memory _prizes = new Prize[](1);
        _prizes[0] = Prize(PrizeInterface.ERC721, _prizeContract, _prizeId, 0);
        return this.createAuction(_auctionOwner, _paymentToken, _minimumTickSize, _prizes, _minimumBid);
    }

    // Marked for deprecation
    function createAuction(
        address _auctionOwner,
        address _paymentToken,
        uint256 _minimumTickSize,
        address _prizeContract,
        uint256 _prizeId
    ) public returns (address) {
        Prize[] memory _prizes = new Prize[](1);
        _prizes[0] = Prize(PrizeInterface.ERC721, _prizeContract, _prizeId, 0);
        return this.createAuction(_auctionOwner, _paymentToken, _minimumTickSize, _prizes, 0);
    }
}
