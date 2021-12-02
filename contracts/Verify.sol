// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "hardhat/console.sol";

contract Verify {
    using MerkleProof for bytes32[];
    bytes32 public immutable merkleRoot;
    mapping(uint256 => address) private claimedTokenAddresses;

    constructor(bytes32 _merkleRoot) {
        merkleRoot = _merkleRoot;
    }

    function verify(
        bytes32[] calldata merkleProof,
        uint256 _tokenId,
        address _account
    ) public view returns (bool) {
        console.logBytes32(merkleRoot);
        bytes32 node = keccak256(abi.encodePacked(_tokenId, _account));
        console.logBytes32(node);
        console.log(
            "Merkle proof valid: %s",
            MerkleProof.verify(merkleProof, merkleRoot, node)
        );
        return MerkleProof.verify(merkleProof, merkleRoot, node);
    }

    function claim(
        bytes32[] calldata merkleProof,
        uint256 _amount,
        address _account,
        uint256 _tokenId
    ) external payable {
        require(
            verify(merkleProof, _tokenId, _account),
            "Claim: Invalid merkle proof"
        );
        for (uint256 i = 0; i < _amount; i++) {
            claimedTokenAddresses[_tokenId] = _account;
        }
    }

    function addressOfClaimedToken(
        bytes32[] calldata merkleProof,
        uint256 _tokenId,
        address _account
    ) external view returns (address) {
        require(
            verify(merkleProof, _tokenId, _account),
            "Return address: Invalid merkle proof"
        );
        return claimedTokenAddresses[_tokenId];
    }
}
