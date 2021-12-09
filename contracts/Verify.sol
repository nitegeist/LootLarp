// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "hardhat/console.sol";

contract Verify {
    using MerkleProof for bytes32[];
    using Counters for Counters.Counter;
    bytes32 public immutable merkleRoot;
    mapping(uint256 => address) private claimedTokenAddresses;
    Counters.Counter private tokens;

    constructor(bytes32 _merkleRoot) {
        merkleRoot = _merkleRoot;
    }

    function verify(
        bytes32[] calldata merkleProof,
        uint256 _tokenId,
        address _account
    ) public view returns (bool) {
        return
            MerkleProof.verify(
                merkleProof,
                merkleRoot,
                keccak256(abi.encodePacked(_tokenId, _account))
            );
    }

    function claim(uint256 _amount) external payable {
        for (uint256 i = 0; i < _amount; i++) {
            uint256 tokenId = tokens.current();
            claimedTokenAddresses[tokenId] = msg.sender;
            tokens.increment();
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
