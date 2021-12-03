const { SignerWithAddress } = require('@nomiclabs/hardhat-ethers/signers');
const { MerkleTree } = require('merkletreejs');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { keccak256, bufferToHex } = require('ethereumjs-util');
const { utils } = require('ethers');

describe('Private Mint', function () {
	let owner, buyer, accounts, addresses;
	let redemptionFactory, redemptionContract;
	let maxSupply = 508;
	let payment = utils.parseEther('0.25');
	const merkleTree = {};

	beforeEach(async function () {
		redemptionFactory = await hre.ethers.getContractFactory('Redemption');
		[owner, buyer, ...accounts] = await ethers.getSigners();
		await SignerWithAddress.create(owner);
		await SignerWithAddress.create(buyer);
		addresses = accounts.map((account) => account.address);
		merkleTree.leaves = accounts.map((account) => bufferToHex(utils.solidityKeccak256(['address'], [account.address])));
		merkleTree.tree = new MerkleTree(merkleTree.leaves, keccak256, { sort: true });
		merkleTree.root = merkleTree.tree.getHexRoot();
		redemptionContract = await redemptionFactory.deploy(0, 0, 0, merkleTree.root);
		await redemptionContract.deployed();
		await redemptionContract.batchGrantPreferredMinterRole(addresses);
	});

	it('Should revert with private mint not active', async function () {
		accounts.map(async (account) => {
			const leaf = bufferToHex(utils.solidityKeccak256(['address'], [account.address]));
			const proof = merkleTree.tree.getHexProof(leaf);
			await expect(redemptionContract.connect(buyer).privateMint(2, proof)).to.be.revertedWith(
				'Private Mint: Private mint is not active'
			);
		});
	});

	it('Should batch revoke preferred minter role', async function () {
		await redemptionContract.batchRevokePreferredMinterRole(addresses);
	});
});
