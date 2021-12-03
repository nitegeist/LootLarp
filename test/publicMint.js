const { SignerWithAddress } = require('@nomiclabs/hardhat-ethers/signers');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { MerkleTree } = require('merkletreejs');
const { keccak256, bufferToHex } = require('ethereumjs-util');
const { utils } = require('ethers');

describe('Public Mint', function () {
	let owner, buyer, accounts;
	let redemptionFactory, redemptionContract;
	let maxSupply = 508;
	let payment = ethers.utils.parseEther('0.25');
	const merkleTree = {};

	beforeEach(async function () {
		redemptionFactory = await hre.ethers.getContractFactory('Redemption');
		[owner, buyer, ...accounts] = await ethers.getSigners();
		await SignerWithAddress.create(owner);
		await SignerWithAddress.create(buyer);
		merkleTree.leaves = accounts.map((account) => bufferToHex(utils.solidityKeccak256(['address'], [account.address])));
		merkleTree.tree = new MerkleTree(merkleTree.leaves, keccak256, { sort: true });
		merkleTree.root = merkleTree.tree.getHexRoot();
		redemptionContract = await redemptionFactory.deploy(0, 0, 0, merkleTree.root);
		await redemptionContract.deployed();
		await redemptionContract.togglePublicClaim();
	});

	it('Should revert with not an admin', async function () {
		await expect(redemptionContract.connect(buyer).togglePublicClaim()).to.be.revertedWith(
			'Must have admin role to toggle public claim'
		);
	});

	it('Should toggle public claim', async function () {
		await redemptionContract.connect(owner).togglePublicClaim();
		expect(await redemptionContract.publicClaim()).to.be.false;
	});

	it('Should successfully mint two tokens', async function () {
		await redemptionContract.connect(buyer).publicMint(2, { value: ethers.utils.parseEther('0.5') });
		expect(await redemptionContract.balanceOf(buyer.address)).to.equal(2);
	});

	it('Should revert with max amount', async function () {
		await expect(
			redemptionContract.connect(buyer).publicMint(3, { value: ethers.utils.parseEther('0.75') })
		).to.be.revertedWith('Max of two token claims per address');
	});

	it('Should revert with two token limit reached', async function () {
		await redemptionContract.connect(buyer).publicMint(2, { value: ethers.utils.parseEther('0.5') });
		await expect(redemptionContract.connect(buyer).publicMint(1, { value: payment })).to.be.revertedWith(
			'Only two tokens can be minted per address'
		);
	});

	it('Should revert with incorrect payment amount', async function () {
		await expect(
			redemptionContract.connect(buyer).publicMint(1, { value: ethers.utils.parseEther('0.3') })
		).to.be.revertedWith('Public Mint: Incorrect payment amount');
	});

	it('Should revert with public mint not active', async function () {
		await redemptionContract.connect(owner).togglePublicClaim(); // false
		await expect(redemptionContract.connect(buyer).publicMint(1, { value: payment })).to.be.revertedWith(
			'Public mint is not active'
		);
	});
});
