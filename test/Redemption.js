const { expect } = require('chai');

describe('Redemption Contract', function () {
	let owner, randomAddress;
	let Redemption, redemptionContract;

	beforeEach(async function () {
		Redemption = await ethers.getContractFactory('Redemption');
		[owner, randomAddress] = await ethers.getSigners();
		redemptionContract = await Redemption.deploy(0, 0, 0);
		await redemptionContract.deployed();
	});

	describe('Deployment', function () {
		it('Successfully deploys contract', async function () {
			// expect(await redemptionContract.owner()).to.equal(owner.address);
			expect(await redemptionContract.publicClaim().to.equal(false));
		});
	});
});
