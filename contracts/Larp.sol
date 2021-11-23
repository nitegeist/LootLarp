// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";

/**
 * @title ERC721 Smart Contract for LootLARP
 *
 * @author Nitegeist
 */
contract Larp is
    IERC721Metadata,
    ERC721URIStorage,
    ERC721PresetMinterPauserAutoId,
    ReentrancyGuard
{
    using Strings for uint256;
    using Counters for Counters.Counter;
    bytes32 public constant PREFERRED_MINTER_ROLE =
        keccak256("PREFERRED_MINTER_ROLE");
    Counters.Counter private _totalMinted;
    uint256 listingPrice = 25 * 10e15; // 0.25 ETH

    // Address of interface identifier for royalty standard
    bytes4 private constant INTERFACE_ID_ERC2981 = 0x2a55205a;

    // Token ID constants
    uint256 private constant TOTAL_CLAIMABLE_TOKENS = 500;
    uint256 private constant TOTAL_LEGENDARY_TOKENS = 8;
    uint256 private constant TOTAL_SUPPLY = 508;

    // baseUri
    string public constant BASE_URI = "ipfs://";

    // private claim
    uint256 startTime;
    uint256 endTime;

    // Status of public claim
    bool public publicClaim;

    // Status of public claim
    bool public privateRedeem;

    constructor(uint256 _startTime)
        ERC721PresetMinterPauserAutoId("Larp", "LARP", BASE_URI)
    {
        startTime = _startTime;
        endTime = _startTime + 1 days;
    }

    // Returns baseURI
    function _baseURI()
        internal
        view
        virtual
        override(ERC721, ERC721PresetMinterPauserAutoId)
        returns (string memory)
    {
        return BASE_URI;
    }

    // Batch grants preferred minter role
    function batchGrantPreferredMinterRole(address[] memory _accounts) public {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Must have admin role grant preferred minter role"
        );
        for (uint256 i = 0; i < _accounts.length; i++) {
            // Checks if addresses already have this role
            require(
                !hasRole(PREFERRED_MINTER_ROLE, _accounts[i]),
                "This address has already been assigned this role"
            );
            grantRole(PREFERRED_MINTER_ROLE, _accounts[i]);
        }
    }

    // Batch revokes preferred minter role
    function batchRevokePreferredMinterRole(address[] memory _accounts)
        external
    {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Must have admin role revoke preferred minter role"
        );
        for (uint256 i = 0; i < _accounts.length; i++) {
            // Checks if addresses don't have this role
            require(
                hasRole(PREFERRED_MINTER_ROLE, _accounts[i]),
                "This address does not have this role"
            );
            revokeRole(PREFERRED_MINTER_ROLE, _accounts[i]);
        }
    }

    // Toggle public claim
    function togglePublicClaim() external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Must have admin role to toggle public claim"
        );
        require(block.timestamp > endTime, "Private claim has not ended");
        publicClaim = !publicClaim;
    }

    // Toggle private redeem
    function togglePrivateRedeem() external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Must have admin role to toggle private redeem"
        );
        require(block.timestamp > endTime, "Private claim has not ended");
        require(!publicClaim, "Public claim has not ended");
        privateRedeem = !privateRedeem;
    }

    // Gets listing price
    function getListingPrice() external view returns (uint256) {
        return listingPrice;
    }

    // Get available supply
    function getAvailableSupply() external view returns (uint256) {
        return TOTAL_SUPPLY - _totalMinted.current();
    }

    // Sets listing price in wei
    function setListingPrice(uint256 _wei) external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Must have admin role to set price"
        );
        listingPrice = _wei;
    }

    // Public mint function
    function publicMint(string memory tokenUri) external payable nonReentrant {
        require(
            msg.value == listingPrice,
            "Public Mint: Incorrect payment amount"
        );
        require(
            balanceOf(_msgSender()) <= 2,
            "Only two tokens can be minted per address"
        );
        require(publicClaim, "Public mint is not active");
        uint256 totalMinted = _totalMinted.current();
        _mintToken(totalMinted, tokenUri, _msgSender());
        _totalMinted.increment();
    }

    // Private mint function
    function privateMint(string memory tokenUri) external payable nonReentrant {
        require(
            hasRole(PREFERRED_MINTER_ROLE, _msgSender()),
            "Private Mint: Must have preferred minter role to mint"
        );
        require(
            msg.value == listingPrice,
            "Private Mint: Incorrect payment amount"
        );
        require(
            balanceOf(_msgSender()) <= 2,
            "Private Mint: Only two tokens can be minted per address"
        );
        require(
            block.timestamp > startTime && block.timestamp < endTime,
            "Private Mint: Private mint inactive"
        );
        uint256 totalMinted = _totalMinted.current();
        _mintToken(totalMinted, tokenUri, _msgSender());
        _totalMinted.increment();
    }

    // Door staff mint function
    function privateEventRedeem(string memory tokenUri)
        external
        payable
        nonReentrant
    {
        require(
            hasRole(MINTER_ROLE, _msgSender()),
            "Private Redeem: Must have minter role to mint"
        );
        require(
            msg.value == listingPrice,
            "Private Redeem: Incorrect payment amount"
        );
        require(
            balanceOf(_msgSender()) <= 2,
            "Private Redeem: Only two tokens can be minted per address"
        );
        require(privateRedeem, "Private Redeem: Private redeem is not active");
        uint256 totalMinted = _totalMinted.current();
        _mintToken(totalMinted, tokenUri, _msgSender());
        _totalMinted.increment();
    }

    function _mintToken(
        uint256 tokenId,
        string memory tokenUri,
        address _to
    ) private {
        _safeMint(_to, tokenId);
        _setTokenURI(tokenId, tokenUri);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721PresetMinterPauserAutoId, ERC721) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    // The following functions are overrides required by Solidity.

    function _burn(uint256 tokenId)
        internal
        override(ERC721, ERC721URIStorage)
    {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage, IERC721Metadata)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /**
     * @notice See {IERC2981-royaltyInfo}.
     */
    function royaltyInfo(address _receiver, uint256 _salePrice)
        external
        pure
        returns (address, uint256 royaltyAmount)
    {
        royaltyAmount = (_salePrice * 10) / 100; // 10% royalty
        return (_receiver, royaltyAmount);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721PresetMinterPauserAutoId, IERC165, ERC721)
        returns (bool)
    {
        return
            interfaceId == INTERFACE_ID_ERC2981 ||
            super.supportsInterface(interfaceId);
    }
}
