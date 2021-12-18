require('@nomiclabs/hardhat-waffle');
require("dotenv").config();
require("@nomiclabs/hardhat-etherscan");
require("hardhat-abi-exporter");

// The next line is part of the sample project, you don't need it in your
// project. It imports a Hardhat task definition, that can be used for
// testing the frontend.
require('./tasks/faucet');

const {
	INFURA_KEY,
	PRIVATE_KEY,
	ETHERSCAN_API_KEY
} = process.env;
const accounts = [`0x${PRIVATE_KEY}`];

// if using infura, you can add new networks by adding the name as it is seen in the infura url
const INFURA_NETWORKS = [
	"mainnet",
	"rinkeby",
];

const networks = ["mainnet", "rinkeby"];

function makeNetwork(_network) {
	if (INFURA_NETWORKS.includes(_network))
		return {
			url: `https://${_network}.infura.io/v3/${INFURA_KEY}`,
			accounts,
		};

	return {};
}

module.exports = {
	defaultNetwork: 'hardhat',
	networks: {
		hardhat: {
			chainId: 1337,
		},
		...networks.reduce((obj, entry) => {
			obj[entry] = makeNetwork(entry);
			return obj;
		}, {}),
	},
	solidity: {
		version: '0.8.4',
		settings: {
			optimizer: {
				enabled: true,
				runs: 200,
			},
		},
	},
	etherscan: {
		apiKey: `${ETHERSCAN_API_KEY}`,
	},
	paths: {
		sources: "./contracts",
		tests: "./test",
		cache: "./cache",
		artifacts: "./artifacts",
	},
	abiExporter: {
		path: "./test/abi",
		clear: true,
		flat: true,
	}
};
