const { network, run, ethers } = require("hardhat");

async function main() {
	const [deployer] = await ethers.getSigners();

	console.log("Deploying onto network:", network.name);
	console.log('Deploying the contracts with the account:', await deployer.getAddress());
	console.log('Account balance:', (await deployer.getBalance()).toString());

	const redemptionFactory = await ethers.getContractFactory('Redemption');
	const redemptionContract = await redemptionFactory.deploy();
	await redemptionContract.deployed();

	console.log('Redemption address:', redemptionContract.address);
	
	console.log("Verifying on etherscan...");
	if (network.name != "hardhat") {
		await run("verify", {
			address: redemptionContract.address,
			constructorArgParams: [
				0,
				0,
				0,
			],
		});
		console.log("Verified :D");
	}

	// We also save the contract's artifacts and address in the frontend directory
	const deploymentInfo = {
		network: network.name,
		"Redemption Contract Address": redemptionContract.address,
	}
	fs.writeFileSync(
		`deployments/script-${network.name}.json`,
		JSON.stringify(deploymentInfo)
	);

	console.log(`Latest contract address written to: deployments/script=${network.name}.json`);
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
