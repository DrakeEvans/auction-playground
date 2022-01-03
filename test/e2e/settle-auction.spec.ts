import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Signer } from "ethers";
import { ethers, network } from "hardhat";
const {
  utils,
  utils: { parseEther, parseUnits, formatEther },
} = ethers;

import { Auction, AuctionLibrary, AuctionFactory, WrappedEther, BoredApeYachtClub } from "../../typechain";
import { deploy, deployContracts, ContractsWithSigners, setupAuction, makeBid } from "./helpers";

describe("Settle Auctions", () => {
  it("owner (or anyone) can send winning to auction owner", async () => {});
});
