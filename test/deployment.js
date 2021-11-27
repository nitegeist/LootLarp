const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Redemption Contract', function () {
	let owner, randomAddress, addresses;
	let redemptionFactory, redemptionContract;
	let maxSupply = 508;

	beforeEach(async function () {
		redemptionFactory = await hre.ethers.getContractFactory('Redemption');
		[owner, randomAddress, ...addresses] = await ethers.getSigners();

		redemptionContract = await redemptionFactory.deploy(0, 0, 0);
		await redemptionContract.deployed();
	});

	describe('Deployment', function () {
		it('Successfully deploys contract', async function () {
			expect(await redemptionContract.publicClaim()).to.be.false;
			expect(await redemptionContract.getListingPrice()).to.equal(ethers.utils.parseEther('0.25'));
			expect(await redemptionContract.getAvailableSupply()).to.equal(maxSupply);
		});
		it('Should set listing price to 0.3', async function () {
			await redemptionContract.setListingPrice(ethers.utils.parseEther('0.3'));
			expect(await redemptionContract.getListingPrice()).to.equal(ethers.utils.parseEther('0.3'));
		});
		// it('Should revert with not an admin', async function () {
		// 	expect(redemptionContract.connect(owner).setListingPrice(ethers.utils.parseEther('0.3'))).to.be.revertedWith(
		// 		'Must have admin role to set price'
		// 	);
		// });
	});
});
