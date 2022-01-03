// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/interfaces/IERC1155.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "./Auction.sol";

contract PrizeManager {
    enum PrizeInterface {
        ERC721,
        ERC20,
        ERC1155
    }

    struct Prize {
        PrizeInterface prizeInterface;
        address prizeContract;
        uint256 prizeId;
        uint256 amount;
    }

    function transferPrizes(
        address _from,
        address _to,
        Prize[] memory _prizes
    ) internal {
        for (uint256 i = 0; i < _prizes.length; i++) {
            Prize memory _currentPrize = _prizes[i];
            if (_currentPrize.prizeInterface == PrizeInterface.ERC721) {
                IERC721(_currentPrize.prizeContract).transferFrom(_from, _to, _currentPrize.prizeId);
            }
            if (_currentPrize.prizeInterface == PrizeInterface.ERC20) {
                bool _sentERC20 = IERC20(_currentPrize.prizeContract).transferFrom(_from, _to, _currentPrize.prizeId);
                require(_sentERC20, "Unable to transfer ERC20 prize");
            }
            // if (_currentPrize.prizeInterface == PrizeInterface.ERC1155) {
            // }
        }
    }
}
