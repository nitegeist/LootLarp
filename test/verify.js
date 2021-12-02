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
		const address = '0xa111C225A0aFd5aD64221B1bc1D5d817e5D3Ca15';
		const token = '56660740342816081431743222872731117427526580551422435935884080137676694505177';
		const proof = merkleTree.tree.getHexProof(hashToken(token, address));
		console.log('proof: ', proof);
		await contract.claim(proof, 1, address, token);
		expect(await contract.addressOfClaimedToken(proof, token, address)).to.equal(address);
	});
});
