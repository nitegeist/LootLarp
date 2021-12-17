const { MerkleTree } = require('merkletreejs');
const { expect } = require('chai');
const { ethers, network } = require('hardhat');
const { keccak256, bufferToHex } = require('ethereumjs-util');
const { utils } = require('ethers');

describe('Private Mint', function () {
	let owner, buyer, accounts, addresses;
	let redemptionFactory, redemptionContract;
	let maxSupply = 508;
	let payment = utils.parseEther('0.5');
	const merkleTree = {};

	beforeEach(async function () {
		redemptionFactory = await hre.ethers.getContractFactory('Redemption');
		[owner, buyer, ...accounts] = await ethers.getSigners();
		addresses = accounts.map((account) => account.address);
		merkleTree.leaves = accounts.map((account) => bufferToHex(utils.solidityKeccak256(['address'], [account.address])));
		merkleTree.tree = new MerkleTree(merkleTree.leaves, keccak256, { sort: true });
		merkleTree.root = merkleTree.tree.getHexRoot();
		redemptionContract = await redemptionFactory.deploy(merkleTree.root);
		await redemptionContract.deployed();
		await redemptionContract.batchGrantPreferredMinterRole(addresses);
	});

	it('Should revert with private mint not active', async function () {
		await network.provider.request({
			method: 'evm_increaseTime',
			params: [3600 * 49],
		});
		const leaf = bufferToHex(utils.solidityKeccak256(['address'], [accounts[0].address]));
		const proof = merkleTree.tree.getHexProof(leaf);
		await expect(
			redemptionContract.connect(accounts[0]).privateMint(2, proof, { value: utils.parseEther('1') })
		).to.be.revertedWith('Private Mint: Private mint is not active');
	});

	it('Should activate private mint and mint tokens for address', async function () {
		const leaf = bufferToHex(utils.solidityKeccak256(['address'], [accounts[0].address]));
		const proof = merkleTree.tree.getHexProof(leaf);
		await redemptionContract.connect(accounts[0]).privateMint(2, proof, { value: utils.parseEther('1') });
		expect(await redemptionContract.balanceOf(accounts[0].address)).to.equal(2);
	});

	it('Should batch revoke preferred minter role', async function () {
		await redemptionContract.batchRevokePreferredMinterRole(addresses);
		for (let i = 0; i < addresses.length; i++) {
			expect(await redemptionContract.hasRole(redemptionContract.PREFERRED_MINTER_ROLE(), addresses[i])).to.be.false;
		}
	});
});
