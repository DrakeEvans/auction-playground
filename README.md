## Prompt

The goal of this challenge is to design an on-chain auction system for NFTs. By the end of the challenge, we should have a fully-functional auction contract, similar to one that supports ecosystems like [Foundation](https://foundation.app) and [SuperRare](https://superrare.co). Please write your contracts from scratch, and refrain from copying these - we've studied these contracts and we know the idioms they use.

Complete the following steps to implement the auction system, in order:

1. A creator should be able to deposit an ERC721 asset to the contract, and create an auction.
2. A creator should be optionally able to set a minimum bid for their auction.
3. A creator should be able to auction off their NFT for any ERC20 token. All bids for an auction must use the same token.
4. The system should be able to handle multiple auctions running at once.
5. A bidder should be able to place a bid for a certain auction, with their bid being deposited into the contract.
6. A bidder should have any funds deposited into the contract returned to them if they are outbid.
7. After the first bid, the auction ends 15 minutes after the last bid is placed. Each new bid should extend the auction 15 minutes.
8. After the auction is complete, either the creator or winning bidder should be able to 'settle' the auction, with the tokens transferred to the creator, and the NFT transferred to the winning bidder.
9. The auction should have a 'quick finish' option - if any bid comes in that is 5 times higher than the previous bid, the creator should be able to end the instantly end auction if they so choose (as long as the auction hasn't ended already).
10. The auction should support 'third-party delivery' - when a bidder places a bid, they can optionally choose to have the NFT delivered to a different address if they win. This third-party address should provide a signature attesting that they want to receive the NFT, which the bidder should provide at the time of the transaction. A bid should be invalid if the signature is not provided, or the signer does not match the desired third-party receiver.
11. The auction should support bundling - instead of one ERC721 asset being auctioned off, a creator should be able to auction multiple assets off in a bundle. There is a single auction for the bundle, no matter how many assets go into the bundle. All assets should be delivered at once during settlement.
12. Extend bundling to also support ERC1155 and ERC20.

Beyond the system requirements above, and the guidelines on how much time to spend, this challenge is open-ended. Experimentation is encouraged! Feel free to extend with new features, or harden the system with tests and/or documentation.

## Follow-Up Questions

1. How would you design an auction system that does not require bidders to post collateral? Are there any additional off-chain considerations for this system?
2. We just implemented a classic auction where bids are taken and the highest bidder wins. What other auction mechanisms exist in NFT marketplaces today? What are the pros vs. cons of these approaches?
3. For high-demand NFT mints, there are often more willing minters than editions available to mint. How would you design a minting system for a high-demand NFT release that ensures both smooth UX and fairness? Hint: gas auctions and setups that favor bots aren't fair.

Please answer these 3 questions in a separate Markdown file, submitted with your branch.
