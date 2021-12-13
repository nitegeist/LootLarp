const { expect } = require('chai');
const { ethers } = require('hardhat');
const { MerkleTree } = require('merkletreejs');
const { keccak256, bufferToHex } = require('ethereumjs-util');
const { utils } = require('ethers');

describe('Deployment', function () {
	let owner, buyer, accounts;
	let redemptionFactory, redemptionContract;
	let maxSupply = 508;
	const merkleTree = {};

	beforeEach(async function () {
		redemptionFactory = await hre.ethers.getContractFactory('Redemption');
		[owner, buyer, ...accounts] = await ethers.getSigners();
		merkleTree.leaves = accounts.map((account) => bufferToHex(utils.solidityKeccak256(['address'], [account.address])));
		merkleTree.tree = new MerkleTree(merkleTree.leaves, keccak256, { sort: true });
		merkleTree.root = merkleTree.tree.getHexRoot();
		redemptionContract = await redemptionFactory.deploy(0, 0, 0, merkleTree.root);
		await redemptionContract.deployed();
	});

	it('Successfully deploys contract', async function () {
		expect(await redemptionContract.publicClaim()).to.be.false;
		expect(await redemptionContract.getListingPrice()).to.equal(ethers.utils.parseEther('0.5'));
		expect(await redemptionContract.getAvailableSupply()).to.equal(maxSupply);
	});
	it('Should set listing price to 0.3', async function () {
		await redemptionContract.connect(owner).setListingPrice(ethers.utils.parseEther('0.3'));
		expect(await redemptionContract.getListingPrice()).to.equal(ethers.utils.parseEther('0.3'));
	});
	it('Should revert with not an admin', async function () {
		await expect(redemptionContract.connect(buyer).setListingPrice(ethers.utils.parseEther('0.3'))).to.be.revertedWith(
			'Must have admin role to set price'
		);
	});
});
