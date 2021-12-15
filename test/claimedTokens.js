const { MerkleTree } = require('merkletreejs');
const { expect } = require('chai');
const { ethers, network } = require('hardhat');
const { keccak256, bufferToHex } = require('ethereumjs-util');
const { utils, BigNumber } = require('ethers');
const tokens = require('./tokens.json');

function hashToken(tokenId, account) {
	return bufferToHex(utils.solidityKeccak256(['uint256', 'address'], [tokenId, account]));
}

describe('Claimed Tokens', function () {
	let owner, buyer, accounts;
	let redemptionFactory, redemptionContract;
	let maxSupply = 508;
	let rareSupply = 8;
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
		redemptionContract = await redemptionFactory.deploy(0, 0, preferredMinterMerkleTree.root);
		await redemptionContract.deployed();
		await network.provider.request({
			method: 'evm_increaseTime',
			params: [3600 * 49],
		});
		await redemptionContract.togglePublicClaim();
		await redemptionContract.connect(owner).initialize(claimedTokenMerkleTree.root);
	});

	it('Should not allow an account that is not admin to set the root', async function () {
		redemptionContract = await redemptionFactory.deploy(0, 0, preferredMinterMerkleTree.root);
		await redemptionContract.deployed();
		await expect(redemptionContract.connect(buyer).initialize(claimedTokenMerkleTree.root)).to.be.revertedWith(
			'Must be an admin'
		);
	});

	it('Should set the merkle tree root only once', async function () {
		await expect(redemptionContract.connect(owner).initialize(claimedTokenMerkleTree.root)).to.be.revertedWith(
			'Already initialized'
		);
	});

	it('Should revert with same token Id for item1 & item2', async function () {
		const proof1 = claimedTokenMerkleTree.tree.getHexProof(hashToken(1, buyer.address));
		const proof2 = claimedTokenMerkleTree.tree.getHexProof(hashToken(2, buyer.address));
		await expect(redemptionContract.connect(buyer).claim(1, 1, proof1, 1, 2, proof2)).to.be.revertedWith(
			'Token ID args cannot be the same'
		);
	});

	it('Should revert with same loot Id for item1 & item2', async function () {
		const proof1 = claimedTokenMerkleTree.tree.getHexProof(hashToken(1, buyer.address));
		const proof2 = claimedTokenMerkleTree.tree.getHexProof(hashToken(2, buyer.address));
		await expect(redemptionContract.connect(buyer).claim(1, 1, proof1, 2, 1, proof2)).to.be.revertedWith(
			'Loot args cannot be the same'
		);
	});

	it('Should revert with not owner of token id 1', async function () {
		await redemptionContract.connect(buyer).publicMint(2, { value: utils.parseEther('1') });
		const proof1 = claimedTokenMerkleTree.tree.getHexProof(hashToken(1, buyer.address));
		const proof2 = claimedTokenMerkleTree.tree.getHexProof(hashToken(2, buyer.address));
		await expect(redemptionContract.connect(accounts[0]).claim(1, 1, proof1, 2, 2, proof2)).to.be.revertedWith(
			'!owner of _tokenId1'
		);
	});

	it('Should revert with must have admin to view claims', async function () {
		await expect(redemptionContract.connect(buyer).viewClaims(buyer.address)).to.be.revertedWith(
			'Must have admin role to view claims'
		);
	});

	it('Should revert with invalid item1 proof', async function () {
		await redemptionContract.connect(buyer).publicMint(2, { value: utils.parseEther('1') });
		const proof1 = claimedTokenMerkleTree.tree.getHexProof(hashToken(1, buyer.address));
		const proof2 = claimedTokenMerkleTree.tree.getHexProof(hashToken(2, buyer.address));
		await expect(redemptionContract.connect(buyer).claim(1, 1, proof2, 2, 2, proof1)).to.be.revertedWith(
			'invalid item1 proof'
		);
	});

	it('Should revert with invalid item2 proof', async function () {
		await redemptionContract.connect(buyer).publicMint(2, { value: utils.parseEther('1') });
		const proof1 = claimedTokenMerkleTree.tree.getHexProof(hashToken(1, buyer.address));
		const proof2 = claimedTokenMerkleTree.tree.getHexProof(hashToken(2, buyer.address));
		await expect(redemptionContract.connect(buyer).claim(1, 1, proof1, 2, 2, proof1)).to.be.revertedWith(
			'invalid item2 proof'
		);
	});

	it('Should claim one token with valid merkle proof and return claim', async function () {
		await redemptionContract.connect(buyer).publicMint(1, { value: payment });
		const proof1 = claimedTokenMerkleTree.tree.getHexProof(hashToken(1, buyer.address));
		await redemptionContract.connect(buyer).claim(1, 1, proof1, 0, 0, []);
		const claims = await redemptionContract.connect(owner).viewClaims(buyer.address);
		console.log('Item 1 Token Id: %s', BigNumber.from(claims.item1.tokenId).toNumber());
		console.log('Item 1 Loot Id: %s', BigNumber.from(claims.item1.lootId).toNumber());
	});

	it('Should claim two tokens with valid merkle proof and return claims', async function () {
		await redemptionContract.connect(buyer).publicMint(2, { value: utils.parseEther('1') });
		const proof1 = claimedTokenMerkleTree.tree.getHexProof(hashToken(1, buyer.address));
		const proof2 = claimedTokenMerkleTree.tree.getHexProof(hashToken(2, buyer.address));
		await redemptionContract.connect(buyer).claim(1, 1, proof1, 2, 2, proof2);
		const claims = await redemptionContract.connect(owner).viewClaims(buyer.address);
		console.log('Item 1 Token Id: %s', BigNumber.from(claims.item1.tokenId).toNumber());
		console.log('Item 1 Loot Id: %s', BigNumber.from(claims.item1.lootId).toNumber());
		console.log('Item 2 Token Id: %s', BigNumber.from(claims.item2.tokenId).toNumber());
		console.log('Item 2 Loot Id: %s', BigNumber.from(claims.item2.lootId).toNumber());
	});
});
