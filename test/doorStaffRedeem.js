const { MerkleTree } = require('merkletreejs');
const { expect } = require('chai');
const { ethers, network } = require('hardhat');
const { keccak256, bufferToHex } = require('ethereumjs-util');
const { utils } = require('ethers');

describe('Door Staff Redeem', function () {
	let owner, buyer, doorStaff, accounts;
	let redemptionFactory, redemptionContract;
	let maxSupply = 508;
	let payment = utils.parseEther('0.5');
	const merkleTree = {};

	beforeEach(async function () {
		redemptionFactory = await hre.ethers.getContractFactory('Redemption');
		[owner, buyer, doorStaff, ...accounts] = await ethers.getSigners();
		merkleTree.leaves = accounts.map((account) => bufferToHex(utils.solidityKeccak256(['address'], [account.address])));
		merkleTree.tree = new MerkleTree(merkleTree.leaves, keccak256, { sort: true });
		merkleTree.root = merkleTree.tree.getHexRoot();
		redemptionContract = await redemptionFactory.deploy();
		await redemptionContract.deployed();
		await redemptionContract.connect(owner).initializeMint(merkleTree.root);
		await network.provider.request({
			method: 'evm_increaseTime',
			params: [3600 * 49],
		});
	});

	it('Should toggle door staff redeem', async function () {
		await redemptionContract.connect(owner).toggleDoorStaffRedeem();
		expect(await redemptionContract.doorRedeem()).to.be.true;
	});

	it('Should revert with door staff redeem not active', async function () {
		await expect(
			redemptionContract.connect(doorStaff).doorStaffRedeem(2, buyer.address, { value: utils.parseEther('1') })
		).to.be.revertedWith('Door Mint: Door staff mint is not active');
	});

	it('Should activate door staff redeem and redeem tokens for buyer', async function () {
		await redemptionContract.connect(owner).toggleDoorStaffRedeem();
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
				.refundDoorStaffPayment(buyer.address, { value: utils.parseEther('1') })
		).to.be.ok;
	});
});
