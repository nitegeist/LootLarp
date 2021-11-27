async function main() {
	const [deployer] = await ethers.getSigners();

	console.log('Deploying the contracts with the account:', await deployer.getAddress());
	console.log('Account balance:', (await deployer.getBalance()).toString());

	const redemptionFactory = await ethers.getContractFactory('Redemption');
	const redemptionContract = await redemptionFactory.deploy(0, 0, 0);
	await redemptionContract.deployed();

	console.log('Redemption address:', redemptionContract.address);

	// We also save the contract's artifacts and address in the frontend directory
	// saveFrontendFiles(token);
}

// function saveFrontendFiles(token) {
//   const fs = require("fs");
//   const contractsDir = __dirname + "/../frontend/src/contracts";

//   if (!fs.existsSync(contractsDir)) {
//     fs.mkdirSync(contractsDir);
//   }

//   fs.writeFileSync(
//     contractsDir + "/contract-address.json",
//     JSON.stringify({ Token: token.address }, undefined, 2)
//   );

//   const TokenArtifact = artifacts.readArtifactSync("Token");

//   fs.writeFileSync(
//     contractsDir + "/Token.json",
//     JSON.stringify(TokenArtifact, null, 2)
//   );
// }

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
