const { SignerWithAddress } = require('@nomiclabs/hardhat-ethers/signers');
const { MerkleTree } = require('merkletreejs');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { keccak256 } = require('@ethersproject/keccak256');

function hashRole(role, address) {
	return Buffer.from(
		ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['bytes32', 'address'], [role, address])),
		'hex'
	);
}

describe('Redemption Contract', function () {
	let owner, buyer, accounts, addresses;
	let redemptionFactory, redemptionContract;
	let maxSupply = 508;
	let payment = ethers.utils.parseEther('0.25');
	let merkleTree;

	beforeEach(async function () {
		redemptionFactory = await hre.ethers.getContractFactory('Redemption');
		[owner, buyer, ...accounts] = await ethers.getSigners();
		await SignerWithAddress.create(owner);
		await SignerWithAddress.create(buyer);
		redemptionContract = await redemptionFactory.deploy(0, 0, 0);
		await redemptionContract.deployed();
	});
	describe('Private Mint', function () {
		beforeEach(async function () {
			addresses = accounts.map((account) => account.address);
			await redemptionContract.batchGrantPreferredMinterRole(addresses);
			// merkleTree = new MerkleTree(
			// 	addresses.map((address) => hashRole(redemptionContract.PREFERRED_MINTER_ROLE(), address)),
			// 	keccak256,
			// 	{ sortPairs: true }
			// );
		});

		// it('Should return true for a valid merkle proof', async function () {
		// 	await addresses.map(async (address) => {
		// 		const root = merkleTree.getHexRoot();
		// 		const proof = merkleTree.getHexProof(hashRole(redemptionContract.PREFERRED_MINTER_ROLE(), address));
		// 		expect(await redemptionContract.connect(address).isPreferredMinter(proof, root)).to.be.true;
		// 	});
		// });

		it('Should batch revoke preferred minter role', async function () {
			await redemptionContract.batchRevokePreferredMinterRole(addresses);
		});
	});
});
