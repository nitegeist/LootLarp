// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";
import "hardhat/console.sol";

/**
 * @title ERC721 Smart Contract for LootLARP
 *
 * @author @nitegeist, @carlfarterson
 */
contract Redemption is
    IERC721Metadata,
    ERC721URIStorage,
    ERC721PresetMinterPauserAutoId,
    ReentrancyGuard
{
    using Strings for uint256;
    using MerkleProof for bytes32[];
    using Counters for Counters.Counter;
    bytes32 public prefferedMinterRoot;
    bytes32 public claimedTokensRoot;
    bytes32 public constant PREFERRED_MINTER_ROLE =
        keccak256("PREFERRED_MINTER_ROLE");
    Counters.Counter private _totalMinted;
    Counters.Counter private _rareMinted;
    Counters.Counter private _doorMinted;
    uint256 listingPrice = 5 * 10e16; // 0.5 ETH
    mapping(address => uint256) payments;
    mapping(address => uint256) mintCount;
    struct Claim {
        uint256 tokenId;
        uint256 lootId;
    }
    mapping(address => Claim) item1Claims;
    mapping(address => Claim) item2Claims;

    // Address of interface identifier for royalty standard
    bytes4 private constant INTERFACE_ID_ERC2981 = 0x2a55205a;

    // Token ID constants
    uint256 private constant TOTAL_LEGENDARY_TOKENS = 8;

    uint256 private maxSupply = 508; // 500 + legendaries

    // baseUri
    string public constant BASE_URI = "ipfs://";

    // private claim
    uint256 startTime;
    uint256 endTime;

    // public claim boolean
    bool public publicClaim;

    // door staff mint boolean
    bool public doorRedeem;

    // initializers
    bool public claimInitialized;
    bool public mintInitialized;

    constructor()
        ERC721PresetMinterPauserAutoId("Redemption", "RDMN", BASE_URI)
    {}

    function transferAdmin(address _account) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Not an admin");
        _setupRole(DEFAULT_ADMIN_ROLE, _account);
        revokeRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function initializeClaim(bytes32 _root) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Must be an admin");
        require(!claimInitialized, "Already initialized");
        claimInitialized = true;
        claimedTokensRoot = _root;
    }

    function initializeMint(bytes32 _root) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Must be an admin");
        require(!mintInitialized, "Already initialized");
        mintInitialized = true;
        prefferedMinterRoot = _root;
        startTime = block.timestamp;
        endTime = block.timestamp + 2 days;
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

    function setMaxSupply(uint256 _amount) external payable {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Must be an admin");
        maxSupply = maxSupply + _amount;
    }

    function getMaxSupply() external view returns (uint256) {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Must be an admin");
        return maxSupply;
    }

    // Batch grants preferred minter role
    function batchGrantPreferredMinterRole(address[] memory _accounts)
        external
    {
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

    function isPreferredMinter(bytes32[] calldata proof, address _address)
        internal
        view
        returns (bool)
    {
        return
            MerkleProof.verify(
                proof,
                prefferedMinterRoot,
                keccak256(abi.encodePacked(_address))
            );
    }

    function isValidLootClaim(
        bytes32[] calldata merkleProof,
        uint256 _tokenId,
        address _account
    ) public view returns (bool) {
        require(claimInitialized, "!initialized");
        return
            MerkleProof.verify(
                merkleProof,
                claimedTokensRoot,
                keccak256(abi.encodePacked(_tokenId, _account))
            );
    }

    function claim(
        uint256 _tokenId1,
        uint256 _lootId1,
        bytes32[] calldata merkleProof1,
        uint256 _tokenId2,
        uint256 _lootId2,
        bytes32[] calldata merkleProof2
    ) external {
        require(claimInitialized, "!initialized");
        require(_tokenId1 != _tokenId2, "Token ID args cannot be the same");
        require(_lootId1 != _lootId2, "Loot args cannot be the same");

        Claim storage item1 = item1Claims[_msgSender()];
        Claim storage item2 = item2Claims[_msgSender()];
        if (_tokenId1 != 0) {
            require(_tokenId1 != item2.tokenId, "_tokenId1 == item2.tokenId");
            require(_lootId1 != item2.lootId, "_lootId1 == item2.lootId");
            require(ownerOf(_tokenId1) == _msgSender(), "!owner of _tokenId1");
            require(item1.tokenId == 0, "item1 claimed");
        }
        if (_tokenId2 != 0) {
            require(_tokenId2 != item1.tokenId, "_tokenId2 == item1.tokenId");
            require(_lootId2 != item1.lootId, "_lootId2 == item1.lootId");
            require(ownerOf(_tokenId2) == _msgSender(), "!owner of _tokenId2");
            require(item2.tokenId == 0, "item2 claimed");
        }
        if (_tokenId1 != 0 && _lootId1 != 0) {
            require(
                isValidLootClaim(merkleProof1, _tokenId1, _msgSender()),
                "invalid item1 proof"
            );
            item1.tokenId = _tokenId1;
            item1.lootId = _lootId1;
        }
        if (_tokenId2 != 0 && _lootId2 != 0) {
            if (_tokenId1 == 0) {
                require(item1.tokenId != 0, "Cannot claim item2 without item1");
            }
            require(
                isValidLootClaim(merkleProof2, _tokenId2, _msgSender()),
                "invalid item2 proof"
            );
            item2.tokenId = _tokenId2;
            item2.lootId = _lootId2;
        }
    }

    function viewClaims(address _account)
        external
        view
        returns (Claim memory item1, Claim memory item2)
    {
        require(claimInitialized, "!initialized");
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Must have admin role to view claims"
        );
        item1 = item1Claims[_account];
        item2 = item2Claims[_account];
    }

    // Toggle public claim
    function togglePublicClaim() external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Must have admin role to toggle public claim"
        );
        require(mintInitialized, "!initialized");
        require(block.timestamp > endTime, "Private claim has not ended");
        publicClaim = !publicClaim;
    }

    // Toggle door staff redeem
    function toggleDoorStaffRedeem() external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Must have admin role to toggle door staff redeem"
        );
        require(mintInitialized, "!initialized");
        require(block.timestamp > endTime, "Private claim has not ended");
        doorRedeem = !doorRedeem;
    }

    // Gets listing price
    function getListingPrice() external view returns (uint256) {
        return listingPrice;
    }

    // Get total minted
    function getTotalMinted() external view returns (uint256) {
        return _totalMinted.current();
    }

    // Get available supply
    function getAvailableSupply() external view returns (uint256) {
        return (maxSupply - TOTAL_LEGENDARY_TOKENS) - _totalMinted.current();
    }

    // Sets listing price in wei
    function setListingPrice(uint256 _wei) external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Must have admin role to set price"
        );
        listingPrice = _wei;
    }

    function mintLegendary(uint256 _amount) external payable nonReentrant {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Must have admin role to mint"
        );
        require(_amount > 0, "Cannot mint 0");
        require(
            _amount + _rareMinted.current() <= TOTAL_LEGENDARY_TOKENS,
            "All legendaries minted"
        );
        require(
            _amount + _totalMinted.current() <= maxSupply,
            "Max supply reached"
        );
        for (uint256 i = 0; i < _amount; i++) {
            // Mint legendary to caller
            _totalMinted.increment();
            uint256 tokenId = _totalMinted.current();
            string memory tokenUri = string(
                abi.encodePacked(BASE_URI, tokenId)
            );
            _mintToken(tokenId, tokenUri, _msgSender());
            _rareMinted.increment();
        }
    }

    // Additional token mint
    function additionalMint(uint256 _amount) external payable nonReentrant {
        require(mintInitialized, "!initialized");
        require(!publicClaim, "Public mint is active");
        require(
            block.timestamp > endTime,
            "Additional Mint: Private mint is active"
        );
        require(!doorRedeem, "Additional Mint: Door staff mint is active");
        require(
            listingPrice * _amount == msg.value,
            "Additional Mint: Incorrect payment amount"
        );
        require(
            _amount + _totalMinted.current() <= maxSupply,
            "Total claimable supply reached"
        );
        require(_amount > 0, "Cannot mint 0");
        require(
            _amount + balanceOf(_msgSender()) <= 2 &&
                _amount + mintCount[_msgSender()] <= 2,
            "Max of two token claims per address"
        );
        for (uint256 i = 0; i < _amount; i++) {
            _totalMinted.increment();
            uint256 tokenId = _totalMinted.current();
            string memory tokenUri = string(
                abi.encodePacked(BASE_URI, tokenId)
            );
            _mintToken(tokenId, tokenUri, _msgSender());
        }
        mintCount[_msgSender()] += _amount;
    }

    // Public mint function
    function publicMint(uint256 _amount) external payable nonReentrant {
        require(publicClaim, "Public mint is not active");
        require(
            listingPrice * _amount == msg.value,
            "Public Mint: Incorrect payment amount"
        );
        require(
            _amount + _totalMinted.current() <= maxSupply,
            "Total claimable supply reached"
        );
        require(_amount > 0, "Cannot mint 0");
        require(
            _amount + balanceOf(_msgSender()) <= 2 &&
                _amount + mintCount[_msgSender()] <= 2,
            "Max of two token claims per address"
        );

        for (uint256 i = 0; i < _amount; i++) {
            _totalMinted.increment();
            uint256 tokenId = _totalMinted.current();
            string memory tokenUri = string(
                abi.encodePacked(BASE_URI, tokenId)
            );
            _mintToken(tokenId, tokenUri, _msgSender());
        }
        mintCount[_msgSender()] += _amount;
    }

    // Private mint function
    function privateMint(uint256 _amount, bytes32[] calldata proof)
        external
        payable
        nonReentrant
    {
        require(mintInitialized, "!initialized");
        require(
            block.timestamp > startTime && block.timestamp < endTime,
            "Private Mint: Private mint is not active"
        );
        require(
            hasRole(PREFERRED_MINTER_ROLE, _msgSender()),
            "Private Mint: Address is not a preferred minter"
        );
        require(
            isPreferredMinter(proof, _msgSender()),
            "Private Mint: Caller is not a preferred minter"
        );
        require(
            listingPrice * _amount == msg.value,
            "Private Mint: Incorrect payment amount"
        );
        require(_amount > 0, "Cannot mint 0");
        require(
            _amount + balanceOf(_msgSender()) <= 2 &&
                _amount + mintCount[_msgSender()] <= 2,
            "Max of two token claims per address"
        );
        require(
            _amount + _totalMinted.current() <= maxSupply,
            "Total supply reached"
        );
        for (uint256 i = 0; i < _amount; i++) {
            _totalMinted.increment();
            uint256 tokenId = _totalMinted.current();
            string memory tokenUri = string(
                abi.encodePacked(BASE_URI, tokenId)
            );
            _mintToken(tokenId, tokenUri, _msgSender());
        }
        mintCount[_msgSender()] += _amount;
    }

    // Door staff mint function
    function doorStaffRedeem(uint256 _amount, address recipient)
        external
        payable
        nonReentrant
    {
        require(doorRedeem, "Door Mint: Door staff mint is not active");
        require(
            hasRole(MINTER_ROLE, _msgSender()),
            "Door Mint: Must have minter role to mint"
        );
        require(
            listingPrice * _amount == msg.value,
            "Door Mint: Incorrect payment amount"
        );
        require(_amount > 0, "Cannot mint 0");
        require(
            _amount + balanceOf(recipient) <= 2 &&
                _amount + mintCount[recipient] <= 2,
            "Max of two token claims per address"
        );
        require(
            _amount + _totalMinted.current() <= maxSupply,
            "Total supply reached"
        );
        for (uint256 i = 0; i < _amount; i++) {
            _totalMinted.increment();
            uint256 tokenId = _totalMinted.current();
            string memory tokenUri = string(
                abi.encodePacked(BASE_URI, tokenId)
            );
            _mintToken(tokenId, tokenUri, recipient);
            _doorMinted.increment();
        }
        payments[recipient] -= listingPrice;
        mintCount[recipient] += _amount;
    }

    // In case the price changes or door staff just needs to do a refund
    function refundDoorStaffPayment(address payable recipient)
        external
        payable
    {
        require(
            hasRole(MINTER_ROLE, _msgSender()),
            "Refund: Must have minter role to refund"
        );
        require(payments[recipient] > 0, "No payment to refund");
        (bool sent, ) = recipient.call{value: msg.value}("");
        require(sent, "Failed to send Ether");
        delete payments[recipient];
    }

    // Door staff can collect payment from recipients
    function payDoorStaff(uint256 _amount) external payable nonReentrant {
        require(balanceOf(_msgSender()) < 2, "Already owns 2 tokens");
        require(
            listingPrice * _amount == msg.value,
            "Door Staff: Incorrect payment amount"
        );
        payments[_msgSender()] += listingPrice;
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
