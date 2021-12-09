const { MerkleTree } = require('merkletreejs');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { keccak256, bufferToHex } = require('ethereumjs-util');
const { utils } = require('ethers');
const tokens = require('./tokens.json');

function hashToken(tokenId, account) {
	return bufferToHex(utils.solidityKeccak256(['uint256', 'address'], [tokenId, account]));
}

describe('Verify', function () {
	let factory, contract;
	let owner, buyer, accounts;
	const merkleTree = {};

	beforeEach(async function () {
		factory = await hre.ethers.getContractFactory('Verify');
		[owner, buyer, ...accounts] = await ethers.getSigners();
		merkleTree.leaves = Object.entries(tokens).map((token) => hashToken(...token));
		merkleTree.tree = new MerkleTree(merkleTree.leaves, keccak256, { sort: true });
		merkleTree.root = merkleTree.tree.getHexRoot();
		contract = await factory.deploy(merkleTree.root);
		await contract.deployed();
	});

	it('Should claim token with valid merkle proof and return address of claimed token', async function () {
		await contract.connect(buyer).claim(2);
		for (let i = 0; i < 2; i++) {
			const proof = merkleTree.tree.getHexProof(hashToken(i, buyer.address));
			expect(await contract.addressOfClaimedToken(proof, i, buyer.address)).to.equal(buyer.address);
		}
	});
});
