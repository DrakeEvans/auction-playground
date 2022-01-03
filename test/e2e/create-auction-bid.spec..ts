import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Signer } from "ethers";
import { ethers } from "hardhat";
const {
  utils,
  utils: { parseEther, parseUnits, formatEther },
} = ethers;

import { Auction, AuctionLibrary, AuctionFactory, WrappedEther, BoredApeYachtClub } from "../../typechain";
import { deploy, deployContracts, ContractsWithSigners, setupAuction, makeBid } from "./helpers";

describe("A creator should be able to deposit an ERC721 asset to the contract, and create an auction", () => {
  it("When given all the parameters, a signer can create an auction", async () => {
    const { auctionLibrary, auctionFactory, wrappedEther, boredApeYachtClub, owner, signers } = await deployContracts();
    const auction = await ethers.getContractFactory("Auction");
    const user1 = signers[0];

    const newAuctionEvent = await setupAuction(user1, 21, {
      auctionLibrary,
      auctionFactory,
      wrappedEther,
      boredApeYachtClub,
      owner,
      signers,
    });
    expect(newAuctionEvent?.args?.owner).to.equal(user1.address);
    expect((await auction.attach(newAuctionEvent?.args?.auctionAddress)?.createdOn()).toNumber()).to.be.greaterThan(0);
  });

  it("Should revert if the NFT is unavailable", async () => {
    const { auctionLibrary, auctionFactory, wrappedEther, boredApeYachtClub, owner, signers } = await deployContracts();
    const user1 = signers[0];

    const createAuctionTx = auctionFactory
      .connect(user1)
      .functions["createAuction(address,address,uint256,address,uint256,uint256)"](
        user1.address,
        wrappedEther.address,
        parseEther("0.1"),
        boredApeYachtClub.address,
        1,
        parseEther("0.1"),
      );
    await expect(createAuctionTx.then(tx => tx.wait())).to.be.reverted;
  });
});

describe("A creator should be optionally able to set a minimum bid for their auction \n& A bidder should be able to place a bid for a certain auction, with their bid being deposited into the contract", () => {
  it("When given a minimum bid, a signer can create an auction", async () => {
    const { auctionLibrary, auctionFactory, wrappedEther, boredApeYachtClub, owner, signers } = await deployContracts();
    const auction = await ethers.getContractFactory("Auction");
    const user1 = signers[0];
    const newAuctionEvent = await setupAuction(
      user1,
      21,
      {
        auctionLibrary,
        auctionFactory,
        wrappedEther,
        boredApeYachtClub,
        owner,
        signers,
      },
      "0.1",
    );

    expect(newAuctionEvent?.args?.owner).to.equal(user1.address);
    expect((await auction.attach(newAuctionEvent?.args?.auctionAddress)?.createdOn()).toNumber()).to.be.greaterThan(0);
  });

  it("When given a minimum bid, bids above the reserve should be successful", async () => {
    const { auctionLibrary, auctionFactory, wrappedEther, boredApeYachtClub, owner, signers } = await deployContracts();
    const auction = await ethers.getContractFactory("Auction");
    const user1 = signers[0];
    const newAuctionEvent = await setupAuction(
      user1,
      21,
      {
        auctionLibrary,
        auctionFactory,
        wrappedEther,
        boredApeYachtClub,
        owner,
        signers,
      },
      "0.1",
    );
    const auctionAddress = newAuctionEvent?.args?.auctionAddress;

    const user2 = signers[1];

    await makeBid(user2, "0.2", auction.attach(auctionAddress), {
      auctionLibrary,
      auctionFactory,
      wrappedEther,
      boredApeYachtClub,
      owner,
      signers,
    }).then(tx => tx.wait());
    const bidInfo = await auction.attach(newAuctionEvent?.args?.auctionAddress).bids(0);
    expect(formatEther(bidInfo.amount)).to.equal("0.2");
  });

  it("When given a minimum bid, bids below the reserve should be reverted", async () => {
    const { auctionLibrary, auctionFactory, wrappedEther, boredApeYachtClub, owner, signers } = await deployContracts();
    const auction = await ethers.getContractFactory("Auction");
    const user1 = signers[0];
    const newAuctionEvent = await setupAuction(
      user1,
      21,
      {
        auctionLibrary,
        auctionFactory,
        wrappedEther,
        boredApeYachtClub,
        owner,
        signers,
      },
      "0.1",
    );
    const auctionAddress = newAuctionEvent?.args?.auctionAddress;

    // Bid below the minimum
    const bidTx = makeBid(user1, "0.001", auction.attach(auctionAddress), {
      auctionLibrary,
      auctionFactory,
      wrappedEther,
      boredApeYachtClub,
      owner,
      signers,
    });
    await expect(bidTx.then(tx => tx.wait())).to.be.reverted;
  });
});

describe("The system should be able to handle multiple auctions running at once", () => {
  it("When multiple auctions are running, there are no side effects", async () => {
    const { auctionLibrary, auctionFactory, wrappedEther, boredApeYachtClub, owner, signers } = await deployContracts();
    const auction = await ethers.getContractFactory("Auction");

    const user1 = signers[0];
    const user2 = signers[1];

    const newAuctionEvent1 = await setupAuction(user1, 21, {
      auctionLibrary,
      auctionFactory,
      wrappedEther,
      boredApeYachtClub,
      owner,
      signers,
    });
    const newAuctionEvent2 = await setupAuction(user2, 41, {
      auctionLibrary,
      auctionFactory,
      wrappedEther,
      boredApeYachtClub,
      owner,
      signers,
    });

    const address1 = newAuctionEvent1?.args?.auctionAddress;
    const address2 = newAuctionEvent2?.args?.auctionAddress;

    const auction1 = auction.attach(address1);
    const auction2 = auction.attach(address2);

    await makeBid(user2, "0.1", auction.attach(address1), {
      auctionLibrary,
      auctionFactory,
      wrappedEther,
      boredApeYachtClub,
      owner,
      signers,
    });
    await makeBid(user1, "0.35", auction.attach(address2), {
      auctionLibrary,
      auctionFactory,
      wrappedEther,
      boredApeYachtClub,
      owner,
      signers,
    });

    const bidInfo1 = await auction1.bids(0);
    expect(formatEther(bidInfo1.amount)).to.equal("0.1");

    const bidInfo2 = await auction2.bids(0);
    expect(formatEther(bidInfo2.amount)).to.equal("0.35");
  });
});
