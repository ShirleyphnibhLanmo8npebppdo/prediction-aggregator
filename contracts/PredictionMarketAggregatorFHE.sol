pragma solidity ^0.8.24;

import { FHE, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract PredictionMarketAggregatorFHE is SepoliaConfig {

    struct EncryptedMarketData {
        uint256 id;
        euint32 encryptedMarketId;
        euint32 encryptedOdds;        // Encrypted market odds
        euint32 encryptedLiquidity;   // Encrypted liquidity or stake
        uint256 timestamp;
    }

    struct DecryptedMarketData {
        string marketId;
        string odds;
        string liquidity;
        bool isRevealed;
    }

    uint256 public dataCount;
    mapping(uint256 => EncryptedMarketData) public encryptedData;
    mapping(uint256 => DecryptedMarketData) public decryptedData;

    mapping(string => euint32) private encryptedMarketTrend;
    string[] private marketList;

    mapping(uint256 => uint256) private requestToDataId;

    event MarketDataSubmitted(uint256 indexed id, uint256 timestamp);
    event DecryptionRequested(uint256 indexed id);
    event MarketDataDecrypted(uint256 indexed id);

    modifier onlyAggregator(uint256 dataId) {
        _; // placeholder for access control
    }

    /// @notice Submit encrypted market data
    function submitEncryptedMarketData(
        euint32 encryptedMarketId,
        euint32 encryptedOdds,
        euint32 encryptedLiquidity
    ) public {
        dataCount += 1;
        uint256 newId = dataCount;

        encryptedData[newId] = EncryptedMarketData({
            id: newId,
            encryptedMarketId: encryptedMarketId,
            encryptedOdds: encryptedOdds,
            encryptedLiquidity: encryptedLiquidity,
            timestamp: block.timestamp
        });

        decryptedData[newId] = DecryptedMarketData({
            marketId: "",
            odds: "",
            liquidity: "",
            isRevealed: false
        });

        emit MarketDataSubmitted(newId, block.timestamp);
    }

    /// @notice Request decryption of market data
    function requestMarketDataDecryption(uint256 dataId) public onlyAggregator(dataId) {
        EncryptedMarketData storage marketData = encryptedData[dataId];
        require(!decryptedData[dataId].isRevealed, "Already decrypted");

        bytes32 ;
        ciphertexts[0] = FHE.toBytes32(marketData.encryptedMarketId);
        ciphertexts[1] = FHE.toBytes32(marketData.encryptedOdds);
        ciphertexts[2] = FHE.toBytes32(marketData.encryptedLiquidity);

        uint256 reqId = FHE.requestDecryption(ciphertexts, this.decryptMarketData.selector);
        requestToDataId[reqId] = dataId;

        emit DecryptionRequested(dataId);
    }

    /// @notice Callback for decrypted market data
    function decryptMarketData(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory proof
    ) public {
        uint256 dataId = requestToDataId[requestId];
        require(dataId != 0, "Invalid request");

        EncryptedMarketData storage eData = encryptedData[dataId];
        DecryptedMarketData storage dData = decryptedData[dataId];
        require(!dData.isRevealed, "Already decrypted");

        FHE.checkSignatures(requestId, cleartexts, proof);

        string[] memory results = abi.decode(cleartexts, (string[]));

        dData.marketId = results[0];
        dData.odds = results[1];
        dData.liquidity = results[2];
        dData.isRevealed = true;

        if (FHE.isInitialized(encryptedMarketTrend[dData.marketId]) == false) {
            encryptedMarketTrend[dData.marketId] = FHE.asEuint32(0);
            marketList.push(dData.marketId);
        }

        encryptedMarketTrend[dData.marketId] = FHE.add(
            encryptedMarketTrend[dData.marketId],
            FHE.asEuint32(1)
        );

        emit MarketDataDecrypted(dataId);
    }

    /// @notice Get decrypted market data
    function getDecryptedMarketData(uint256 dataId) public view returns (
        string memory marketId,
        string memory odds,
        string memory liquidity,
        bool isRevealed
    ) {
        DecryptedMarketData storage r = decryptedData[dataId];
        return (r.marketId, r.odds, r.liquidity, r.isRevealed);
    }

    /// @notice Get encrypted market trend
    function getEncryptedMarketTrend(string memory marketId) public view returns (euint32) {
        return encryptedMarketTrend[marketId];
    }

    /// @notice Request trend decryption
    function requestMarketTrendDecryption(string memory marketId) public {
        euint32 count = encryptedMarketTrend[marketId];
        require(FHE.isInitialized(count), "Market not found");

        bytes32 ;
        ciphertexts[0] = FHE.toBytes32(count);

        uint256 reqId = FHE.requestDecryption(ciphertexts, this.decryptMarketTrend.selector);
        requestToDataId[reqId] = bytes32ToUint(keccak256(abi.encodePacked(marketId)));
    }

    /// @notice Callback for decrypted trend
    function decryptMarketTrend(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory proof
    ) public {
        uint256 marketHash = requestToDataId[requestId];
        string memory marketId = getMarketFromHash(marketHash);

        FHE.checkSignatures(requestId, cleartexts, proof);

        uint32 trend = abi.decode(cleartexts, (uint32));
    }

    function bytes32ToUint(bytes32 b) private pure returns (uint256) {
        return uint256(b);
    }

    function getMarketFromHash(uint256 hash) private view returns (string memory) {
        for (uint i = 0; i < marketList.length; i++) {
            if (bytes32ToUint(keccak256(abi.encodePacked(marketList[i]))) == hash) {
                return marketList[i];
            }
        }
        revert("Market not found");
    }
}
