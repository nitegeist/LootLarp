const { MerkleTree } = require('merkletreejs');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { keccak256, bufferToHex } = require('ethereumjs-util');
const { utils } = require('ethers');
const tokens = require('./tokens.json');

function hashToken(tokenId, account) {
	return bufferToHex(utils.solidityKeccak256(['uint256', 'address'], [tokenId, account]));
}

describe('Door Staff Redeem', function () {
	let owner, buyer, doorStaff, accounts;
	let redemptionFactory, redemptionContract;
	let maxSupply = 508;
	let payment = utils.parseEther('0.5');
	const preferredMinterMerkleTree = {};
	const claimedTokenMerkleTree = {};

	beforeEach(async function () {
		redemptionFactory = await hre.ethers.getContractFactory('Redemption');
		[owner, buyer, doorStaff, ...accounts] = await ethers.getSigners();
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
		await redemptionContract.connect(owner).initialize(claimedTokenMerkleTree.root);
	});

	it('Should revert with door staff redeem not active', async function () {
		await expect(
			redemptionContract.connect(doorStaff).doorStaffRedeem(2, buyer.address, { value: utils.parseEther('1') })
		).to.be.revertedWith('Door Mint: Door staff mint is not active');
	});

	it('Should activate door staff redeeem and redeem tokens for buyer', async function () {
		const now = new Date();
		const start = (now.getTime() / 1000).toFixed(0);
		const end = (now.setSeconds(now.getSeconds() + 60) / 1000).toFixed(0);
		redemptionContract = await redemptionFactory.deploy(0, start, end, preferredMinterMerkleTree.root);
		await redemptionContract.deployed();
		await redemptionContract.connect(owner).initialize(claimedTokenMerkleTree.root);
		await redemptionContract.grantRole(redemptionContract.MINTER_ROLE(), doorStaff.address);
		await redemptionContract.connect(buyer).payDoorStaff(2, { value: utils.parseEther('1') });
		await redemptionContract.connect(doorStaff).doorStaffRedeem(2, buyer.address, { value: utils.parseEther('1') });
		expect(await redemptionContract.balanceOf(buyer.address)).to.equal(2);
	});

	it('Should refund buyer their ether', async function () {
		await redemptionContract.grantRole(redemptionContract.MINTER_ROLE(), doorStaff.address);
		await redemptionContract.connect(buyer).payDoorStaff(2, { value: utils.parseEther('1') });
		expect(
			await redemptionContract
				.connect(doorStaff)
				.refundDoorStaffPayment(buyer.address, { value: utils.parseEther('0.5') })
		).to.be.ok;
	});
});
