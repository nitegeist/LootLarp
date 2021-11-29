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
		redemptionContract = await redemptionFactory.deploy(0, 0, 0);
		await redemptionContract.deployed();
		await redemptionContract.batchGrantPreferredMinterRole(addresses);
		merkleTree.leaves = accounts.map((account) => bufferToHex(utils.solidityKeccak256(['address'], [account.address])));
		merkleTree.tree = new MerkleTree(merkleTree.leaves, keccak256, { sort: true });
		merkleTree.root = merkleTree.tree.getHexRoot();
	});

	it('Should revert with private mint not active', async function () {
		await redemptionContract.grantRole(redemptionContract.PREFERRED_MINTER_ROLE(), buyer.address);
		accounts.push(buyer);
		merkleTree.leaves = accounts.map((account) => bufferToHex(utils.solidityKeccak256(['address'], [account.address])));
		merkleTree.tree = new MerkleTree(merkleTree.leaves, keccak256, { sort: true });
		merkleTree.root = merkleTree.tree.getHexRoot();
		const leaf = bufferToHex(utils.solidityKeccak256(['address'], [buyer.address]));
		const proof = merkleTree.tree.getHexProof(leaf);
		await expect(redemptionContract.connect(buyer).privateMint(2, proof, merkleTree.root)).to.be.revertedWith(
			'Private Mint: Private mint is not active'
		);
	});

	it('Should return true for a valid merkle proof', async function () {
		accounts.map(async (account) => {
			const leaf = bufferToHex(utils.solidityKeccak256(['address'], [account.address]));
			const proof = merkleTree.tree.getHexProof(leaf);
			expect(await redemptionContract.isPreferredMinter(proof, merkleTree.root, account.address)).to.be.true;
		});
	});

	it('Should return true for a non-minter valid merkle proof', async function () {
		accounts.push(buyer); // push non minter adddress to the accounts list before making the tree
		merkleTree.leaves = accounts.map((account) => bufferToHex(utils.solidityKeccak256(['address'], [account.address])));
		merkleTree.tree = new MerkleTree(merkleTree.leaves, keccak256, { sort: true });
		merkleTree.root = merkleTree.tree.getHexRoot();
		const leaf = bufferToHex(utils.solidityKeccak256(['address'], [buyer.address]));
		const proof = merkleTree.tree.getHexProof(leaf);
		expect(await redemptionContract.isPreferredMinter(proof, merkleTree.root, buyer.address)).to.be.true;
	});

	it('Should return false for a invalid merkle proof', async function () {
		// MerkleTree.print(tree);
		const leaf = bufferToHex(utils.solidityKeccak256(['address'], [buyer.address]));
		// console.log('Leaf: %s', leaf);
		const proof = merkleTree.tree.getHexProof(leaf);
		// console.log('Proof: %s', proof);
		expect(await redemptionContract.isPreferredMinter(proof, merkleTree.root, buyer.address)).to.be.false;
	});

	it('Should batch revoke preferred minter role', async function () {
		await redemptionContract.batchRevokePreferredMinterRole(addresses);
	});
});
