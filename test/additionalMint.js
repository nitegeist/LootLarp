const { expect } = require('chai');
const { ethers, network } = require('hardhat');
const { MerkleTree } = require('merkletreejs');
const { keccak256, bufferToHex } = require('ethereumjs-util');
const { utils } = require('ethers');
const tokens = require('./tokens.json');

function hashToken(tokenId, account) {
	return bufferToHex(utils.solidityKeccak256(['uint256', 'address'], [tokenId, account]));
}

describe('Additional Mint', function () {
	let owner, buyer, accounts;
	let redemptionFactory, redemptionContract;
	let maxSupply = 508;
	let payment = ethers.utils.parseEther('0.5');
	const preferredMinterMerkleTree = {};
	const claimedTokenMerkleTree = {};

	beforeEach(async function () {
		redemptionFactory = await hre.ethers.getContractFactory('Redemption');
		[owner, buyer, ...accounts] = await ethers.getSigners();
		preferredMinterMerkleTree.leaves = accounts.map((account) =>
			bufferToHex(utils.solidityKeccak256(['address'], [account.address]))
		);
		preferredMinterMerkleTree.tree = new MerkleTree(preferredMinterMerkleTree.leaves, keccak256, { sort: true });
		preferredMinterMerkleTree.root = preferredMinterMerkleTree.tree.getHexRoot();
		claimedTokenMerkleTree.leaves = Object.entries(tokens).map((token) => hashToken(...token));
		claimedTokenMerkleTree.tree = new MerkleTree(claimedTokenMerkleTree.leaves, keccak256, { sort: true });
		claimedTokenMerkleTree.root = claimedTokenMerkleTree.tree.getHexRoot();
		redemptionContract = await redemptionFactory.deploy();
		await redemptionContract.deployed();
		await redemptionContract.connect(owner).initializeClaim(claimedTokenMerkleTree.root);
		await redemptionContract.connect(owner).initializeMint(preferredMinterMerkleTree.root);
	});

	it('Should revert with not an admin', async function () {
		await expect(redemptionContract.connect(buyer).mintLegendary(1)).to.be.revertedWith('Must have admin role to mint');
	});

	it('Should revert with all legendaries minted', async function () {
		await redemptionContract.connect(owner).mintLegendary(8);
		await expect(redemptionContract.connect(owner).mintLegendary(1)).to.be.revertedWith('All legendaries minted');
	});

	it('Should mint a legendary token', async function () {
		await redemptionContract.connect(owner).mintLegendary(1);
		expect(await redemptionContract.balanceOf(owner.address)).to.equal(1);
	});

	it('Should revert with public claim is active', async function () {
		await network.provider.request({
			method: 'evm_increaseTime',
			params: [3600 * 49],
		});
		await redemptionContract.connect(owner).togglePublicClaim();
		await expect(
			redemptionContract.connect(buyer).additionalMint(2, { value: utils.parseEther('1') })
		).to.be.revertedWith('Public mint is active');
	});

	it('Should revert with private mint active', async function () {
		redemptionContract = await redemptionFactory.deploy();
		await redemptionContract.deployed();
		await redemptionContract.connect(owner).initializeMint(preferredMinterMerkleTree.root);
		await redemptionContract.connect(owner).initializeClaim(claimedTokenMerkleTree.root);
		await expect(
			redemptionContract.connect(buyer).additionalMint(2, { value: utils.parseEther('1') })
		).to.be.revertedWith('Additional Mint: Private mint is active');
	});

	it('Should revert with door staff mint active', async function () {
		redemptionContract = await redemptionFactory.deploy();
		await redemptionContract.deployed();
		await redemptionContract.connect(owner).initializeMint(preferredMinterMerkleTree.root);
		await network.provider.request({
			method: 'evm_increaseTime',
			params: [3600 * 49],
		});
		await redemptionContract.connect(owner).initializeClaim(claimedTokenMerkleTree.root);
		await redemptionContract.connect(owner).toggleDoorStaffRedeem();
		await expect(
			redemptionContract.connect(buyer).additionalMint(2, { value: utils.parseEther('1') })
		).to.be.revertedWith('Additional Mint: Door staff mint is active');
	});

	it('Should revert with incorrect payment amount', async function () {
		await network.provider.request({
			method: 'evm_increaseTime',
			params: [3600 * 49],
		});
		await expect(
			redemptionContract.connect(buyer).additionalMint(1, { value: ethers.utils.parseEther('0.3') })
		).to.be.revertedWith('Additional Mint: Incorrect payment amount');
	});
});
