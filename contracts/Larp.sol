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
    Counters.Counter private _totalPublicMinted;
    Counters.Counter private _totalPrivateMinted;

    uint256 listingPrice = 250000000000000000; // 0.25 ETH

    // Address of interface identifier for royalty standard
    bytes4 private constant INTERFACE_ID_ERC2981 = 0x2a55205a;

    // Token ID constants
    uint256 private constant MAX_ADDITIONAL_CLAIM_TOKEN_ID = 100;
    uint256 private constant MAX_PUBLIC_CLAIM_TOKEN_ID = 290;
    uint256 private constant MAX_PRIVATE_CLAIM_TOKEN_ID = 10;
    uint256 private constant MAX_CLAIM_TOKEN_ID = 300;

    struct ClaimedToken {
        address account;
        uint256 tokenId;
        bool claimed;
    }
    // Accounts that have claimed tokens
    mapping(address => ClaimedToken) claimedTokenAccounts;

    // Roles mapping
    mapping(address => mapping(bytes32 => bool)) accountRoles;

    // Status of public claim
    bool public publicClaim;

    // Array of token ids for public mint
    uint256[] publicTokenIds;

    // Status of private claim
    bool public privateClaim;

    // Array of token ids for private mint
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

    // Assigns minter role
    function assignMinterRole(address _account, string memory _role) internal {
        bytes32 _chosenRole = keccak256(abi.encodePacked(_role));
        require(_chosenRole == MINTER_ROLE, "The role must be minter");
        // Checks if addresses already have this role
        require(
            hasRole(_chosenRole, _account) == false,
            "This address has already been assigned this role"
        );
        grantRole(_chosenRole, _account);
    }

    // Removes minter role
    function removeMinterRole(address _account, string memory _role) internal {
        bytes32 _chosenRole = keccak256(abi.encodePacked(_role));
        require(_chosenRole == MINTER_ROLE, "The role must be minter");
        // Checks if addresses don't have this role
        require(
            hasRole(_chosenRole, _account) == true,
            "This address does not have this role"
        );
        revokeRole(_chosenRole, _account);
    }

    // Assigns pauser role
    function assignPauserRole(address _account, string memory _role) internal {
        bytes32 _chosenRole = keccak256(abi.encodePacked(_role));
        require(_chosenRole == PAUSER_ROLE, "The role must be pauser");
        // Checks if addresses already have this role
        require(
            hasRole(_chosenRole, _account) == false,
            "This address has already been assigned this role"
        );
        grantRole(_chosenRole, _account);
    }

    // Removes pauser role
    function removePauserRole(address _account, string memory _role) internal {
        bytes32 _chosenRole = keccak256(abi.encodePacked(_role));
        require(_chosenRole == PAUSER_ROLE, "The role must be pauser");
        // Checks if addresses don't have this role
        require(
            hasRole(_chosenRole, _account) == true,
            "This address does not have this role"
        );
        revokeRole(_chosenRole, _account);
    }

    // Assigns preferred minter role
    function assignPreferredMinterRole(address _account, string memory _role)
        internal
    {
        bytes32 _chosenRole = keccak256(abi.encodePacked(_role));
        require(
            _chosenRole == PREFERRED_MINTER_ROLE,
            "The role must be preferred minter"
        );
        // Checks if addresses already have this role
        require(
            hasRole(_chosenRole, _account) == false,
            "This address has already been assigned this role"
        );
        grantRole(_chosenRole, _account);
    }

    // Removes preferred minter role
    function removePreferredMinterRole(address _account, string memory _role)
        internal
    {
        bytes32 _chosenRole = keccak256(abi.encodePacked(_role));
        require(
            _chosenRole == PREFERRED_MINTER_ROLE,
            "The role must be preferred minter"
        );
        // Checks if addresses don't have this role
        require(
            hasRole(_chosenRole, _account) == true,
            "This address does not have this role"
        );
        revokeRole(_chosenRole, _account);
    }

    // Batch assigns roles
    function batchAssignPreferredMinterRole(
        address[] memory _accounts,
        string memory _role
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        bytes32 _chosenRole = keccak256(abi.encodePacked(_role));
        require(
            _chosenRole == PREFERRED_MINTER_ROLE,
            "The role must be preferred minter"
        );
        for (uint256 i = 0; i < _accounts.length; i++) {
            // Checks if addresses already have this role
            require(
                hasRole(_chosenRole, _accounts[i]) == false,
                "This address has already been assigned this role"
            );
            grantRole(_chosenRole, _accounts[i]);
        }
    }

    // Batch removes roles
    function batchRemovePreferredMinterRole(
        address[] memory _accounts,
        string memory _role
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        bytes32 _chosenRole = keccak256(abi.encodePacked(_role));
        require(
            _chosenRole == PREFERRED_MINTER_ROLE,
            "The role must be preferred minter"
        );
        for (uint256 i = 0; i < _accounts.length; i++) {
            // Checks if addresses don't have this role
            require(
                hasRole(_chosenRole, _accounts[i]) == true,
                "This address does not have this role"
            );
            revokeRole(_chosenRole, _accounts[i]);
        }
    }

    // Checks if an account has a role
    function accountHasRole(address _account, string memory _role)
        internal
        view
    {
        bytes32 _chosenRole = keccak256(abi.encodePacked(_role));
        _checkRole(_chosenRole, _account);
    }

    // Gets listing price
    function getListingPrice() public view returns (uint256) {
        return listingPrice;
    }

    // Sets listing price in wei
    function setListingPrice(uint256 _wei) public onlyRole(DEFAULT_ADMIN_ROLE) {
        listingPrice = _wei;
    }

    // Sets an array of public token ids
    // Requires public ids not to exceed the max amount of public ids that can be generated
    function setPublicTokenIds(uint256[] memory _tokenIds)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(
            _tokenIds.length <= MAX_PUBLIC_CLAIM_TOKEN_ID,
            "Token amount exceeds public token limit"
        );
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            publicTokenIds.push(_tokenIds[i]);
        }
    }

    // Sets an array of private token ids
    // Requires private ids not to exceed the max amount of private ids that can be generated
    function setPrivateTokenIds(uint256[] memory _tokenIds)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(
            _tokenIds.length <= MAX_PRIVATE_CLAIM_TOKEN_ID,
            "Token amount exceeds private token limit"
        );
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            privateTokenIds.push(_tokenIds[i]);
        }
    }

    // Public mint function
    function publicMint(string memory tokenUri)
        public
        payable
        onlyRole(MINTER_ROLE)
        nonReentrant
    {
        address owner = _msgSender();
        uint256 totalMinted = _totalPublicMinted.current();

        require(
            claimedTokenAccounts[owner].claimed == false,
            "This address has already claimed a token"
        );
        require(publicClaim == true, "Public mint is not active");
        require(totalMinted < publicTokenIds.length, "Public mint has ended");
        claimedTokenAccounts[owner] = ClaimedToken(owner, totalMinted, true);
        _mintToken(totalMinted, tokenUri, owner);
        _totalPublicMinted.increment();
    }

    // Private mint function
    function privateMint(string memory tokenUri)
        public
        payable
        onlyRole(PREFERRED_MINTER_ROLE)
        nonReentrant
    {
        address owner = _msgSender();
        uint256 totalMinted = _totalPrivateMinted.current();
        require(
            claimedTokenAccounts[owner].claimed == false,
            "This address has already claimed a token"
        );
        require(privateClaim == true, "Private mint is not active");
        require(totalMinted < privateTokenIds.length, "Private mint has ended");
        claimedTokenAccounts[owner] = ClaimedToken(owner, totalMinted, true);
        _mintToken(totalMinted, tokenUri, owner);
        _totalPrivateMinted.increment();
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
        return
            interfaceId == INTERFACE_ID_ERC2981 ||
            super.supportsInterface(interfaceId);
    }
}
