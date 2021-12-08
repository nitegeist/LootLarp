const { MerkleTree } = require('merkletreejs');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { keccak256, bufferToHex } = require('ethereumjs-util');
const { utils } = require('ethers');
const tokens = require('./tokens.json');

function hashToken(tokenId, account) {
	return bufferToHex(utils.solidityKeccak256(['uint256', 'address'], [tokenId, account]));
}

describe('Claimed Tokens', function () {
	let owner, buyer, accounts;
	let redemptionFactory, redemptionContract;
	let maxSupply = 508;
	let payment = ethers.utils.parseEther('0.25');
	const merkleTree = {};

	beforeEach(async function () {
		redemptionFactory = await hre.ethers.getContractFactory('Redemption');
		merkleTree.leaves = Object.entries(tokens).map((token) => hashToken(...token));
		merkleTree.tree = new MerkleTree(merkleTree.leaves, keccak256, { sort: true });
		merkleTree.root = merkleTree.tree.getHexRoot();
		redemptionContract = await factory.deploy();
		await redemptionContract.deployed();
		await redemptionContract.togglePublicClaim();
	});

	// it('Should claim token with valid merkle proof and return address of claimed token', async function () {
	// 	const address = '0x30e2326ee1bf319EFA6117E6E6C8Df334243E76d';
	// 	const token1 = '16';
	// 	const token2 = '22';
	// 	const proof1 = merkleTree.tree.getHexProof(hashToken(token1, address));
	// 	await redemptionContract.claim(proof1, 1, address, token1);
	// 	const proof2 = merkleTree.tree.getHexProof(hashToken(token2, address));
	// 	await redemptionContract.claim(proof2, 1, address, token2);
	// 	expect(await redemptionContract.addressOfClaimedToken(proof1, token1, address)).to.equal(address);
	// 	expect(await redemptionContract.addressOfClaimedToken(proof2, token2, address)).to.equal(address);
	// });
});
