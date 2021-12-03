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
	const merkleTree = {};

	beforeEach(async function () {
		factory = await hre.ethers.getContractFactory('Verify');
		merkleTree.leaves = Object.entries(tokens).map((token) => hashToken(...token));
		merkleTree.tree = new MerkleTree(merkleTree.leaves, keccak256, { sort: true });
		merkleTree.root = merkleTree.tree.getHexRoot();
		contract = await factory.deploy(merkleTree.root);
		await contract.deployed();
	});

	it('Should claim token with valid merkle proof and return address of claimed token', async function () {
		const address = '0x30e2326ee1bf319EFA6117E6E6C8Df334243E76d';
		const token1 = '16';
		const token2 = '22';
		const proof1 = merkleTree.tree.getHexProof(hashToken(token1, address));
		await contract.claim(proof1, 1, address, token1);
		const proof2 = merkleTree.tree.getHexProof(hashToken(token2, address));
		await contract.claim(proof2, 1, address, token2);
		expect(await contract.addressOfClaimedToken(proof1, token1, address)).to.equal(address);
		expect(await contract.addressOfClaimedToken(proof2, token2, address)).to.equal(address);
	});
});
