const { MerkleTree } = require('merkletreejs');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { keccak256, bufferToHex } = require('ethereumjs-util');
const { utils } = require('ethers');
const tokens = require('./tokens.json');

function hashToken(account, tokenId) {
	let token;
	Array.isArray(tokenId) ? tokenId.map((id) => (token = id)) : (token = tokenId);
	return bufferToHex(utils.solidityKeccak256(['address'], [account]));
}

describe('Verify', function () {
	let factory, contract;
	const merkleTree = {};

	beforeEach(async function () {
		factory = await hre.ethers.getContractFactory('Verify');
		contract = await factory.deploy();
		await contract.deployed();
		merkleTree.leaves = Object.entries(tokens).map((token) => hashToken(...token));
		merkleTree.tree = new MerkleTree(merkleTree.leaves, keccak256, { sort: true });
		merkleTree.root = merkleTree.tree.getHexRoot();
	});

	it('Should verify merkle proof with address alone', async function () {
		Object.entries(tokens).map((token) => {
			async (address, tokenId) => {
				let token;
				Array.isArray(tokenId) ? tokenId.map((id) => (token = id)) : (token = tokenId);
				const leaf = bufferToHex(utils.solidityKeccak256(['address'], [address]));
				const proof = merkleTree.tree.getHexProof(leaf);
				expect(await contract.verifyAddress(proof, merkleTree.root, address)).to.be.true;
			};
		});
	});

	it('Should verify merkle proof with token id alone', async function () {
		Object.entries(tokens).map((token) => {
			async (account, tokenId) => {
				let token;
				Array.isArray(tokenId) ? tokenId.map((id) => (token = id)) : (token = tokenId);
				const leaf = bufferToHex(utils.solidityKeccak256(['uint256'], [token]));
				const proof = merkleTree.tree.getHexProof(leaf);
				expect(await contract.verifyToken(proof, merkleTree.root, token)).to.be.true;
			};
		});
	});

	it('Should verify merkle proof with pairings', async function () {
		Object.entries(tokens).map((token) => {
			async (address, tokenId) => {
				let token;
				Array.isArray(tokenId) ? tokenId.map((id) => (token = id)) : (token = tokenId);
				const proof = merkleTree.tree.getHexProof(hashToken(address, token));
				expect(await contract.verify(proof, merkleTree.root, address, token)).to.be.true;
			};
		});
	});

	it('Should verify merkle proof with a single address', async function () {
		const address = '0x8de806462823aD25056eE8104101F9367E208C14';
		const node = utils.solidityKeccak256(['address'], [address]);
		const leaf = bufferToHex(utils.solidityKeccak256(['address'], [address]));
		const proof = merkleTree.tree.getHexProof(leaf);
		expect(await contract.verifyAddress(proof, merkleTree.root, address)).to.be.true;
	});

	it('Should verify merkle proof with a single token id ', async function () {
		const token = '13988174029436432540570381205111963270292016538206553609831089847857228090619';
		const leaf = bufferToHex(utils.solidityKeccak256(['uint256'], [token]));
		const proof = merkleTree.tree.getHexProof(leaf);
		expect(await contract.verifyToken(proof, merkleTree.root, token)).to.be.true;
	});

	it('Should verify merkle proof with a single pairing', async function () {
		const address = '0x801EfbcFfc2Cf572D4C30De9CEE2a0AFeBfa1Ce1';
		const token = '36416698825062681237969338228395867809712571178321010467907965453371102606457';
		const proof = merkleTree.tree.getHexProof(hashToken(address, token));
		expect(await contract.verify(proof, merkleTree.root, address, token)).to.be.true;
	});
});
