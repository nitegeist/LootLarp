const { MerkleTree } = require('merkletreejs');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { keccak256, bufferToHex } = require('ethereumjs-util');
const { utils } = require('ethers');
const tokens = require('./tokens.json');

function hashToken(tokenId, account) {
	return bufferToHex(utils.solidityKeccak256(['uint256', 'address'], [tokenId, account]));
}

describe('Private Mint', function () {
	let owner, buyer, accounts, addresses;
	let redemptionFactory, redemptionContract;
	let maxSupply = 508;
	let payment = utils.parseEther('0.5');
	const preferredMinterMerkleTree = {};
	const claimedTokenMerkleTree = {};

	beforeEach(async function () {
		redemptionFactory = await hre.ethers.getContractFactory('Redemption');
		[owner, buyer, ...accounts] = await ethers.getSigners();
		addresses = accounts.map((account) => account.address);
		preferredMinterMerkleTree.leaves = accounts.map((account) =>
			bufferToHex(utils.solidityKeccak256(['address'], [account.address]))
		);
		preferredMinterMerkleTree.tree = new MerkleTree(preferredMinterMerkleTree.leaves, keccak256, { sort: true });
		preferredMinterMerkleTree.root = preferredMinterMerkleTree.tree.getHexRoot();
		claimedTokenMerkleTree.leaves = Object.entries(tokens).map((token) => hashToken(...token));
		claimedTokenMerkleTree.tree = new MerkleTree(claimedTokenMerkleTree.leaves, keccak256, { sort: true });
		claimedTokenMerkleTree.root = claimedTokenMerkleTree.tree.getHexRoot();
		redemptionContract = await redemptionFactory.deploy(0, 0, 0, preferredMinterMerkleTree.root);
		await redemptionContract.deployed();
		await redemptionContract.batchGrantPreferredMinterRole(addresses);
		await redemptionContract.connect(owner).initialize(claimedTokenMerkleTree.root);
	});

	it('Should revert with private mint not active', async function () {
		const leaf = bufferToHex(utils.solidityKeccak256(['address'], [accounts[0].address]));
		const proof = preferredMinterMerkleTree.tree.getHexProof(leaf);
		await expect(
			redemptionContract.connect(accounts[0]).privateMint(2, proof, { value: utils.parseEther('1') })
		).to.be.revertedWith('Private Mint: Private mint is not active');
	});

	it('Should activate private mint and mint tokens for address', async function () {
		const start = (new Date().getTime() / 1000).toFixed(0);
		redemptionContract = await redemptionFactory.deploy(start, 0, 0, preferredMinterMerkleTree.root);
		await redemptionContract.deployed();
		await redemptionContract.batchGrantPreferredMinterRole(addresses);
		await redemptionContract.connect(owner).initialize(claimedTokenMerkleTree.root);
		const leaf = bufferToHex(utils.solidityKeccak256(['address'], [accounts[0].address]));
		const proof = preferredMinterMerkleTree.tree.getHexProof(leaf);
		await redemptionContract.connect(accounts[0]).privateMint(2, proof, { value: utils.parseEther('1') });
		expect(await redemptionContract.balanceOf(accounts[0].address)).to.equal(2);
	});

	it('Should batch revoke preferred minter role', async function () {
		await redemptionContract.batchRevokePreferredMinterRole(addresses);
	});
});
