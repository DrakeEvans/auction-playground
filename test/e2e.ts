import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Signer } from "ethers";
import { ethers } from "hardhat";
const {
  utils,
  utils: { parseEther, parseUnits, formatEther },
} = ethers;

import { Auction, AuctionLibrary, AuctionFactory, WrappedEther, BoredApeYachtClub } from "../typechain";

async function deploy(contractName: string, args: any[] = []): Promise<any> {
  try {
    const factory = await ethers.getContractFactory(contractName);
    const contract = await factory.deploy(...args);
    await contract.deployed();
    return contract;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

async function deployContracts() {
  const [owner, ...signers] = await ethers.getSigners();
  // deploy auction library
  const auctionLibrary: AuctionLibrary = await deploy("AuctionLibrary");
  // deploy auction factory
  const auctionFactory: AuctionFactory = await deploy("AuctionFactory", [auctionLibrary.address]);
  // deploy wrapped ether
  const wrappedEther: WrappedEther = await deploy("WrappedEther");
  // deploy ERC-721
  const boredApeYachtClub: BoredApeYachtClub = await deploy("BoredApeYachtClub", [
    "BoredApeYachtClub",
    "BAYC",
    10000,
    0,
  ]);
  await boredApeYachtClub.flipSaleState().then(tx => tx.wait());
  // Seed the signers with some assets
  for (const account of [owner, ...signers]) {
    // Stock with 10k wrapped Eth
    await wrappedEther
      .connect(account)
      .faucet(parseEther("10000"))
      .then(tx => tx.wait());

    // Give 100 BoredApes
    await boredApeYachtClub
      .connect(account)
      .mintApe(20, { value: parseEther("1.6") })
      .then(tx => tx.wait());
  }

  return { auctionLibrary, auctionFactory, wrappedEther, boredApeYachtClub, owner, signers };
}

interface ContractsWithSigners {
  auctionLibrary: AuctionLibrary;
  auctionFactory: AuctionFactory;
  wrappedEther: WrappedEther;
  boredApeYachtClub: BoredApeYachtClub;
  owner: SignerWithAddress;
  signers: SignerWithAddress[];
}

// setup a generic auction
const setupAuction = async (
  user: SignerWithAddress,
  nftId: number,
  contracts: ContractsWithSigners,
  minimumBid?: string,
) => {
  const { auctionLibrary, auctionFactory, wrappedEther, boredApeYachtClub, owner, signers } = contracts;

  await contracts.boredApeYachtClub
    .connect(user)
    .approve(contracts.auctionFactory.address, nftId)
    .then((tx: any) => tx.wait());
  const approvedAddress = await boredApeYachtClub.connect(user).getApproved(nftId);
  expect(approvedAddress).to.be.equal(auctionFactory.address);
  const txReceipt = minimumBid
    ? await auctionFactory
        .connect(user)
        ["createAuction(address,address,uint256,address,uint256,uint256)"](
          user.address,
          wrappedEther.address,
          parseEther("0.1"),
          boredApeYachtClub.address,
          nftId,
          parseEther(minimumBid as string),
        )
        .then(tx => tx.wait())
    : await auctionFactory
        .connect(user)
        ["createAuction(address,address,uint256,address,uint256)"](
          user.address,
          wrappedEther.address,
          parseEther("0.1"),
          boredApeYachtClub.address,
          nftId,
        )
        .then(tx => tx.wait());
  const newAuctionEvent = txReceipt.events?.find(item => item.event === "NewAuction");
  return newAuctionEvent;
};

// Make a bid in the auction
const makeBid = async (user: SignerWithAddress, amount: string, auction: Auction, contracts: ContractsWithSigners) => {
  const { auctionLibrary, auctionFactory, wrappedEther, boredApeYachtClub, owner, signers } = contracts;

  await wrappedEther
    .connect(user)
    .increaseAllowance(auction.address, parseEther(amount))
    .then(tx => tx.wait());
  const bidTx = auction.attach(auction.address).connect(user)["bid(uint256)"](parseEther(amount));

  return bidTx;
};

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
