// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract Verify {
    using MerkleProof for bytes32[];

    constructor() {}

    function _leaf(address account, uint256 tokenId)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(tokenId, account));
    }

    function verify(
        bytes32[] memory proof,
        bytes32 root,
        address _address,
        uint256 _tokenId
    ) public pure returns (bool) {
        return MerkleProof.verify(proof, root, _leaf(_address, _tokenId));
    }

    function verifyAddress(
        bytes32[] memory proof,
        bytes32 root,
        address _address
    ) public pure returns (bool) {
        return
            MerkleProof.verify(
                proof,
                root,
                keccak256(abi.encodePacked(_address))
            );
    }

    function verifyToken(
        bytes32[] memory proof,
        bytes32 root,
        uint256 _token
    ) public pure returns (bool) {
        return
            MerkleProof.verify(
                proof,
                root,
                keccak256(abi.encodePacked(_token))
            );
    }
}
