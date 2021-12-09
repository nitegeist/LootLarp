const { MerkleTree } = require('merkletreejs');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { keccak256, bufferToHex } = require('ethereumjs-util');
const { utils } = require('ethers');
const tokens = require('./tokens.json');

function hashToken(tokenId, account) {
	return bufferToHex(utils.solidityKeccak256(['uint256', 'address'], [tokenId, account]));
}

describe('Claimed Tokens', function () {
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
	});

	it('Should not allow an account that is not admin to set the root', async function () {
		await expect(redemptionContract.connect(buyer).setClaimedTokenRoot(claimedTokenMerkleTree.root)).to.be.revertedWith(
			'Must be an admin'
		);
	});

	it('Should set the merkle tree root only once', async function () {
		await redemptionContract.connect(owner).setClaimedTokenRoot(claimedTokenMerkleTree.root);
		await expect(redemptionContract.connect(owner).setClaimedTokenRoot(claimedTokenMerkleTree.root)).to.be.revertedWith(
			'Contract instance has already been initialized'
		);
	});

	it('Should claim token with valid merkle proof and return address of claimed tokens', async function () {
		await redemptionContract.connect(owner).setClaimedTokenRoot(claimedTokenMerkleTree.root);
		await redemptionContract.connect(buyer).publicMint(2, { value: utils.parseEther('0.5') });
		for (let i = 0; i < 2; i++) {
			const proof = claimedTokenMerkleTree.tree.getHexProof(hashToken(i, buyer.address));
			expect(await redemptionContract.addressOfClaimedToken(proof, i, buyer.address)).to.equal(buyer.address);
		}
	});
});
