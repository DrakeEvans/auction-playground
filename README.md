# Pawn.fi Solidity Interview Challenge

Welcome to the PawnFi Solidity Interview Challenge! This challenge is meant to test your skills around protocol design, architecture, and implementation. It shouldn't be too hard, but it shouldn't be too easy either. 

The challenge will take place in a series of steps, as seen below. Please do each step one at a time, in order. We cannot give credit for any completed steps that may be after an uncompleted step.

If you have any questions, feel free to ask your interviewer. Talking is good! The more we hear from you as you work through the problem below, the better sense we can get of your strengths and weaknesses as a Solidity developer. We want you to get as far as you can, but by no means do you need to complete every step to be successful. The most important thing is for your interviewer to get a sense of how you'd approach a problem and work on it.

To work on the challenge, please clone this repo and create a branch with your name on it. Remember to set up the repo and install dependencies before you work on your code. The repo comes pre-loaded with a set of linters, configs, and test harnesses for your convenience. When the challenge ends, please push your branch.

```
git clone https://github.com/Non-fungible-Technologies/solidity-interview-challenge
git checkout -b <your name>

yarn
```

## Prompt

The goal of this challenge is to design an on-chain auction system for NFTs. By the end of the challenge, we should have a fully-functional auction contract, similar to one that supports ecosystems like [Foundation](https://foundation.app) and [SuperRare](https://superrare.co).

Complete the following steps to implement the auction system, in order:

1. A creator should be able to deposit an ERC721 asset to the contract, and create an auction.
2. A creator should be optionally able to set a minimum bid for their auction.
3. A creator should be able to auction off their NFT for any ERC20 token. All bids for an auction must use the same token.
4. The system should be able to handle multiple auctions running at once.
5. A bidder should be able to place a bid for a certain auction, with their bid being deposited into the contract.
6. A bidder should have any funds deposited into the contract returned to them if they are outbid.
8. After the first bid, the auction ends 15 minutes after the last bid is placed. Each new bid should extend the auction 15 minutes.
9. After the auction is complete, either the creator or winning bidder should be able to 'settle' the auction, with the tokens transferred to the creator, and the NFT transferred to the winning bidder.
10. The auction should have a 'quick finish' option - if any bid comes in that is 5 times higher than the previous bid, the creator should be able to end the instantly end auction if they so choose (as long as the auction hasn't ended already).
11. The auction should support 'third-party delivery' - when a bidder places a bid, they can optionally choose to have the NFT delivered to a different address if they win. This third-party address should provide a signature attesting that they want to receive the NFT, which the bidder should provide at the time of the transaction. A bid should be invalid if the signature is not provided, or the signer does not match the desired third-party receiver.

## Follow-Up Questions

1. How would you design an auction system that does not require bidders to post collateral? Are there any additional off-chain considerations for this system?
2. We just implemented a classic auction where bids are taken and the highest bidder wins. What other auction mechanisms exist in NFT marketplaces today. What are the pros vs. cons of these approaches?
3. For high-demand NFT mints, there are often more willing minters than editions available to mint. How would you design a minting system for a high-demand NFT release that ensures both smooth UX and fairness? Hint: gas auctions and setups that favor bots aren't fair.
