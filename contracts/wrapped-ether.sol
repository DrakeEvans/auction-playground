pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract WrappedEther is ERC20 {
    constructor() ERC20("Wrapped-Eth", "WETH") {}

    function faucet(uint256 _amount) external {
        super._mint(msg.sender, _amount);
    }
}
