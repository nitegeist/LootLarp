const { expect } = require('chai');
const { ethers } = require('hardhat');
const { MerkleTree } = require('merkletreejs');
const { keccak256, bufferToHex } = require('ethereumjs-util');
const { utils } = require('ethers');
const tokens = require('./tokens.json');

function hashToken(tokenId, account) {
	return bufferToHex(utils.solidityKeccak256(['uint256', 'address'], [tokenId, account]));
}

describe('Public Mint', function () {
	let owner, buyer, accounts;
	let redemptionFactory, redemptionContract;
	let maxSupply = 508;
	let payment = ethers.utils.parseEther('0.25');
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
		redemptionContract = await redemptionFactory.deploy(0, 0, 0, preferredMinterMerkleTree.root);
		await redemptionContract.deployed();
		await redemptionContract.togglePublicClaim();
		await redemptionContract.connect(owner).initialize(claimedTokenMerkleTree.root);
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
