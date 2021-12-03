const { MerkleTree } = require('merkletreejs');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { keccak256, bufferToHex } = require('ethereumjs-util');
const { utils } = require('ethers');

describe('Door Staff Redeem', function () {
	let owner, buyer, doorStaff, accounts;
	let redemptionFactory, redemptionContract;
	let maxSupply = 508;
	let payment = utils.parseEther('0.25');
	const merkleTree = {};

	beforeEach(async function () {
		redemptionFactory = await hre.ethers.getContractFactory('Redemption');
		[owner, buyer, doorStaff, ...accounts] = await ethers.getSigners();
		merkleTree.leaves = accounts.map((account) => bufferToHex(utils.solidityKeccak256(['address'], [account.address])));
		merkleTree.tree = new MerkleTree(merkleTree.leaves, keccak256, { sort: true });
		merkleTree.root = merkleTree.tree.getHexRoot();
		redemptionContract = await redemptionFactory.deploy(0, 0, 0, merkleTree.root);
		await redemptionContract.deployed();
	});

	it('Should revert with door staff redeem not active', async function () {
		await expect(
			redemptionContract.connect(accounts[0]).doorStaffRedeem(2, buyer.address, { value: utils.parseEther('0.5') })
		).to.be.revertedWith('Door Mint: Door staff mint is not active');
	});

	it('Should activate door staff redeeem and redeem tokens for buyer', async function () {
		const now = new Date();
		const start = (now.getTime() / 1000).toFixed(0);
		const end = (now.setSeconds(now.getSeconds() + 10) / 1000).toFixed(0);
		redemptionContract = await redemptionFactory.deploy(0, start, end, merkleTree.root);
		await redemptionContract.deployed();
		await redemptionContract.grantRole(redemptionContract.MINTER_ROLE(), accounts[0].address);
		await redemptionContract.connect(buyer).payDoorStaff(2, { value: utils.parseEther('0.5') });
		await redemptionContract.connect(accounts[0]).doorStaffRedeem(2, buyer.address, { value: utils.parseEther('0.5') });
		expect(await redemptionContract.balanceOf(buyer.address)).to.equal(2);
	});

	it('Should refund buyer their ether', async function () {
		await redemptionContract.grantRole(redemptionContract.MINTER_ROLE(), accounts[0].address);
		await redemptionContract.connect(buyer).payDoorStaff(2, { value: utils.parseEther('0.5') });
		expect(
			await redemptionContract
				.connect(accounts[0])
				.refundDoorStaffPayment(buyer.address, { value: utils.parseEther('0.5') })
		).to.be.ok;
	});
});
