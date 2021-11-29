const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Deployment', function () {
	let owner, buyer, accounts;
	let redemptionFactory, redemptionContract;
	let maxSupply = 508;

	beforeEach(async function () {
		redemptionFactory = await hre.ethers.getContractFactory('Redemption');
		[owner, buyer, ...accounts] = await ethers.getSigners();

		redemptionContract = await redemptionFactory.deploy(0, 0, 0);
		await redemptionContract.deployed();
	});

	it('Successfully deploys contract', async function () {
		expect(await redemptionContract.publicClaim()).to.be.false;
		expect(await redemptionContract.getListingPrice()).to.equal(ethers.utils.parseEther('0.25'));
		expect(await redemptionContract.getAvailableSupply()).to.equal(maxSupply);
	});
	it('Should set listing price to 0.3', async function () {
		await redemptionContract.connect(owner).setListingPrice(ethers.utils.parseEther('0.3'));
		expect(await redemptionContract.getListingPrice()).to.equal(ethers.utils.parseEther('0.3'));
	});
	it('Should revert with not an admin', async function () {
		await expect(redemptionContract.connect(buyer).setListingPrice(ethers.utils.parseEther('0.3'))).to.be.revertedWith(
			'Must have admin role to set price'
		);
	});
});
