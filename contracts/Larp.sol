// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title ERC721 token for LootLarp
 *
 * @author Nitegeist
 */
contract Larp is
    ERC721URIStorage,
    Pausable,
    AccessControl,
    ERC721Burnable,
    ReentrancyGuard
{
    using Strings for uint256;
    using Counters for Counters.Counter;
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PREFERRED_MINTER_ROLE =
        keccak256("PREFERRED_MINTER_ROLE");
    Counters.Counter private _tokensMinted;
    Counters.Counter private _tokensClaimed;
    Counters.Counter private _tokensPublicMinted;
    Counters.Counter private _tokensPrivateMinted;

    uint256 listingPrice = 250000000000000000; // 0.25 ETH

    // Address of interface identifier for royalty standard
    bytes4 private constant INTERFACE_ID_ERC2981 = 0x2a55205a;

    // Token ID constants
    uint256 private constant MAX_ADDITIONAL_CLAIM_TOKEN_ID = 100;
    uint256 private constant MAX_PUBLIC_CLAIM_TOKEN_ID = 290;
    uint256 private constant MAX_RARE_CLAIM_TOKEN_ID = 10;
    uint256 private constant MAX_CLAIM_TOKEN_ID = 300;

    // Accounts that have claimed
    mapping(address => mapping(uint256 => bool)) claimedTokenAccounts;

    // Roles mapping
    mapping(address => mapping(uint256 => bool)) accountRoles;

    // Status of public sale
    bool public publicSale;

    // Randomized array of token ids for public mint
    uint256[] publicTokenIds;

    // Status of private sale
    bool public privateSale;

    // Randomized array of token ids for private mint
    uint256[] privateTokenIds;

    constructor() ERC721("Larp", "LARP") {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(PAUSER_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // Add roles
    function addRole(address account, uint256 role) internal {
        accountRoles[account][role] = true;
    }

    // Batch adds preferred minter role
    function batchAddRole(address[] memory _accounts, uint256 role)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        for (uint256 i = 0; i < _accounts.length; i++) {
            accountRoles[_accounts[i]][role] = true;
        }
    }

    // Remove roles
    function removeRole(address account, uint256 role) internal {
        accountRoles[account][role] = false;
    }

    // Check if account has role
    function accountHasRole(address account, uint256 role)
        internal
        view
        returns (bool)
    {
        return accountRoles[account][role];
    }

    // Get listing price
    function getListingPrice() public view returns (uint256) {
        return listingPrice;
    }

    // Set listing price
    function setListingPrice(uint256 _newPrice)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        listingPrice = _newPrice;
    }

    //Public mint function
    function publicMint(string memory tokenUri)
        public
        payable
        onlyRole(MINTER_ROLE)
        nonReentrant
    {
        require(publicSale == true, "Public sale is not active");
        uint256 tokenId = _tokensPublicMinted.current();
        claimedTokenAccounts[msg.sender][tokenId] = true;
        _mintToken(tokenId, tokenUri, msg.sender);
    }

    // Private mint function
    function privateMint(string memory tokenUri)
        public
        payable
        onlyRole(PREFERRED_MINTER_ROLE)
        nonReentrant
    {
        require(privateSale == true, "Private sale is not active");
        uint256 tokenId = _tokensPrivateMinted.current();
        claimedTokenAccounts[msg.sender][tokenId] = true;
        _mintToken(tokenId, tokenUri, msg.sender);
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
    ) internal override whenNotPaused {
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
        override(ERC721, ERC721URIStorage)
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
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
