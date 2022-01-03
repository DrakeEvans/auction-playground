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

describe("Auction endings", () => {
  it("After the first bid, the auction ends 15 minutes after the last bid is placed. Bids received afterwards should be reverted", async () => {
    const contractsWithSigners = await deployContracts();
    const { signers } = contractsWithSigners;
    const auction = await ethers.getContractFactory("Auction");
    const user1 = signers[0];
    const user2 = signers[1];
    const user3 = signers[2];
    const newAuctionEvent = await setupAuction(user1, 21, contractsWithSigners);
    const auctionAddress = newAuctionEvent?.args?.auctionAddress as string;
    await makeBid(user2, "0.1", auction.attach(auctionAddress), contractsWithSigners).then(tx => tx.wait());
    await network.provider.send("evm_increaseTime", [10 * 60]);
    await makeBid(user3, "0.3", auction.attach(auctionAddress), contractsWithSigners).then(tx => tx.wait());
    await network.provider.send("evm_increaseTime", [2 * 60]);

    // If this call is successful we know timer is reset
    await makeBid(user3, "0.4", auction.attach(auctionAddress), contractsWithSigners).then(tx => tx.wait());
    await network.provider.send("evm_increaseTime", [14 * 60]);

    // 16 minutes after latest call
    const makeBidTx = makeBid(user3, "0.3", auction.attach(auctionAddress), contractsWithSigners);
    await expect(makeBidTx).to.be.reverted;
  });

  it("The auction should have a 'quick finish' option - if any bid comes in that is 5 times higher than the previous bid, the creator should be able to end auction the instantly", async () => {
    const contractsWithSigners = await deployContracts();
    const { signers } = contractsWithSigners;
    const auction = await ethers.getContractFactory("Auction");
    const user1 = signers[0];
    const user2 = signers[1];
    const user3 = signers[2];
    const newAuctionEvent = await setupAuction(user1, 21, contractsWithSigners);
    const auctionAddress = newAuctionEvent?.args?.auctionAddress as string;
    await makeBid(user2, "0.1", auction.attach(auctionAddress), contractsWithSigners).then(tx => tx.wait());
    await network.provider.send("evm_increaseTime", [10 * 60]);
    await makeBid(user3, "0.3", auction.attach(auctionAddress), contractsWithSigners).then(tx => tx.wait());
    await network.provider.send("evm_increaseTime", [2 * 60]);

    await makeBid(user3, "1.5", auction.attach(auctionAddress), contractsWithSigners).then(tx => tx.wait());

    const endAuctionTx = auction.attach(auctionAddress).connect(user1).endAuction();
    await expect(endAuctionTx).to.not.be.reverted;
    expect(await auction.attach(auctionAddress).isAuctionActive()).to.be.false;
  });

  it("The auction should have a 'quick finish' option - but should revert if auction is already over", async () => {
    const contractsWithSigners = await deployContracts();
    const { signers } = contractsWithSigners;
    const auction = await ethers.getContractFactory("Auction");
    const user1 = signers[0];
    const user2 = signers[0];
    const user3 = signers[0];
    const newAuctionEvent = await setupAuction(user1, 21, contractsWithSigners);
    const auctionAddress = newAuctionEvent?.args?.auctionAddress as string;
    await makeBid(user2, "0.1", auction.attach(auctionAddress), contractsWithSigners).then(tx => tx.wait());
    await network.provider.send("evm_increaseTime", [10 * 60]);
    await makeBid(user3, "0.3", auction.attach(auctionAddress), contractsWithSigners).then(tx => tx.wait());
    await network.provider.send("evm_increaseTime", [2 * 60]);
    await makeBid(user3, "1.5", auction.attach(auctionAddress), contractsWithSigners).then(tx => tx.wait());
    await network.provider.send("evm_increaseTime", [16 * 60]);

    // 16 minutes after latest call
    const endAuctionTx = auction.attach(auctionAddress).connect(user1).endAuction();
    await expect(endAuctionTx).to.be.reverted;
  });
});
