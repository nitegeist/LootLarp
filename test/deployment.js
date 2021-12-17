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
		redemptionContract = await redemptionFactory.deploy(merkleTree.root);
		await redemptionContract.deployed();
	});

	it('Successfully deploys contract', async function () {
		expect(await redemptionContract.publicClaim()).to.be.false;
		expect(await redemptionContract.getListingPrice()).to.equal(ethers.utils.parseEther('0.5'));
		expect(await redemptionContract.getAvailableSupply()).to.equal(maxSupply);
	});

	it('Should revert with not an admin', async function () {
		await expect(redemptionContract.connect(accounts[0]).transferAdmin(buyer.address)).to.be.revertedWith(
			'Not an admin'
		);
	});

	it('Should transfer admin role to another account', async function () {
		await redemptionContract.connect(owner).transferAdmin(buyer.address);
		expect(await redemptionContract.hasRole(redemptionContract.DEFAULT_ADMIN_ROLE(), buyer.address)).to.be.true;
		expect(await redemptionContract.hasRole(redemptionContract.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.false;
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
	it('Should inflate max supply to 608', async function () {
		await redemptionContract.connect(owner).setMaxSupply(100);
		expect(await redemptionContract.getMaxSupply()).to.equal(608);
	});
	it('Should revert with not an admin', async function () {
		await expect(redemptionContract.connect(buyer).setMaxSupply(100)).to.be.revertedWith('Must be an admin');
	});
});
