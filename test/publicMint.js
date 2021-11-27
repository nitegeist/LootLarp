const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Redemption Contract', function () {
	let owner, buyer, randomAddress, addresses;
	let redemptionFactory, redemptionContract;
	let maxSupply = 508;
	let payment = ethers.utils.parseEther('0.25');

	beforeEach(async function () {
		redemptionFactory = await hre.ethers.getContractFactory('Redemption');
		[owner, buyer, randomAddress, ...addresses] = await ethers.getSigners();

		redemptionContract = await redemptionFactory.deploy(0, 0, 0);
		await redemptionContract.deployed();
	});

	describe('Public Mint', function () {
		beforeEach(async function () {
			await redemptionContract.togglePublicClaim();
		});

		// it('Should revert with not an admin', async function () {
		// 	expect(await redemptionContract.connect(randomAddress).togglePublicClaim()).to.be.revertedWith(
		// 		'Must have admin role to toggle public claim'
		// 	);
		// });

		// it('Should toggle public claim', async function () {
		// 	await redemptionContract.connect(owner).togglePublicClaim();
		// 	expect(redemptionContract.publicClaim()).to.equal(true);
		// });

		// it('Should successfully mint two tokens', async function () {
		// 	await redemptionContract.connect(buyer).publicMint(2, { value: ethers.utils.parseEther('0.5') });
		// 	expect(await redemptionContract.balanceOf(buyer)).to.equal(2);
		// });

		it('Should revert with two token limit reached', async function () {
			await redemptionContract.connect(buyer).publicMint(2, { value: ethers.utils.parseEther('0.5') });
			expect(redemptionContract.connect(buyer).publicMint(1, { value: payment })).to.be.revertedWith(
				'Only two tokens can be minted per address'
			);
		});

		// it('Should revert with incorrect payment amount', async function () {
		// 	expect(
		// 		redemptionContract.connect(buyer).publicMint(1, { value: ethers.utils.parseEther('0.3') })
		// 	).to.be.revertedWith('Public Mint: Incorrect payment amount');
		// });

		// it('Should revert with public sale not active', async function () {
		// 	redemptionContract.togglePublicClaim();
		// 	expect(redemptionContract.publicMint(1, { value: payment })).to.be.revertedWith('Public mint is not active');
		// });
	});
});
