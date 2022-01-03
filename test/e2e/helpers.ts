import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Event, Signer, ContractTransaction } from "ethers";
import { ethers } from "hardhat";
const {
  utils,
  utils: { parseEther, parseUnits, formatEther },
} = ethers;

import { Auction, AuctionLibrary, AuctionFactory, WrappedEther, BoredApeYachtClub } from "../../typechain";

export async function deploy(contractName: string, args: any[] = []): Promise<any> {
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

export async function deployContracts() {
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

export interface ContractsWithSigners {
  auctionLibrary: AuctionLibrary;
  auctionFactory: AuctionFactory;
  wrappedEther: WrappedEther;
  boredApeYachtClub: BoredApeYachtClub;
  owner: SignerWithAddress;
  signers: SignerWithAddress[];
}

// setup a generic auction
export const setupAuction = async (
  user: SignerWithAddress,
  nftId: number,
  contracts: ContractsWithSigners,
  minimumBid?: string,
): Promise<Event> => {
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
  return newAuctionEvent as Event;
};

// Make a bid in the auction
export const makeBid = async (
  user: SignerWithAddress,
  amount: string,
  auction: Auction,
  contracts: ContractsWithSigners,
): Promise<ContractTransaction> => {
  const { auctionLibrary, auctionFactory, wrappedEther, boredApeYachtClub, owner, signers } = contracts;

  await wrappedEther
    .connect(user)
    .increaseAllowance(auction.address, parseEther(amount))
    .then(tx => tx.wait());
  const bidTx = auction.attach(auction.address).connect(user)["bid(uint256)"](parseEther(amount));

  return bidTx;
};
