import { expect } from "chai";
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

describe("A creator should be able to deposit an ERC721 asset to the contract, and create an auction", () => {
  it("When given all the parameters, a signer can create an auction", async () => {
    const { auctionLibrary, auctionFactory, wrappedEther, boredApeYachtClub, owner, signers } = await deployContracts();
    const auction = await ethers.getContractFactory("Auction");
    const user1 = signers[0];

    await boredApeYachtClub
      .connect(user1)
      .approve(auctionFactory.address, 21)
      .then((tx: any) => tx.wait());
    const approvedAddress = await boredApeYachtClub.connect(user1).getApproved(21);
    expect(approvedAddress).to.be.equal(auctionFactory.address);
    const txReceipt = await auctionFactory
      .connect(user1)
      .createAuction(
        user1.address,
        wrappedEther.address,
        parseEther("0.1"),
        boredApeYachtClub.address,
        21,
        parseEther("0.1"),
      )
      .then(tx => tx.wait());
    const newAuctionEvent = txReceipt.events?.find(item => item.event === "NewAuction");
    expect(newAuctionEvent?.args?.owner).to.equal(user1.address);
    expect((await auction.attach(newAuctionEvent?.args?.auctionAddress)?.createdOn()).toNumber()).to.be.greaterThan(0);
  });
  it("When given no minimum bid size, a signer can create an auction", async () => {
    const { auctionLibrary, auctionFactory, wrappedEther, boredApeYachtClub, owner, signers } = await deployContracts();
    const auction = await ethers.getContractFactory("Auction");
    const user1 = signers[0];

    await boredApeYachtClub
      .connect(user1)
      .approve(auctionFactory.address, 21)
      .then((tx: any) => tx.wait());
    const approvedAddress = await boredApeYachtClub.connect(user1).getApproved(21);
    expect(approvedAddress).to.be.equal(auctionFactory.address);
    const txReceipt = await auctionFactory
      .connect(user1)
      .createAuction(user1.address, wrappedEther.address, parseEther("0.1"), boredApeYachtClub.address, 21)
      .then(tx => tx.wait());
    const newAuctionEvent = txReceipt.events?.find(item => item.event === "NewAuction");
    expect(newAuctionEvent?.args?.owner).to.equal(user1.address);
    expect((await auction.attach(newAuctionEvent?.args?.auctionAddress)?.createdOn()).toNumber()).to.be.greaterThan(0);
  });
  it("Should revert if the NFT is unavailable", async () => {
    const { auctionLibrary, auctionFactory, wrappedEther, boredApeYachtClub, owner, signers } = await deployContracts();
    const user1 = signers[0];

    const createAuctionTx = auctionFactory
      .connect(user1)
      .createAuction(
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
