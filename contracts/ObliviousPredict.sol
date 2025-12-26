// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, ebool, euint8, euint64, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IObliviousCoin {
    function mint(address to, euint64 amount) external returns (euint64 transferred);
}

contract ObliviousPredict is ZamaEthereumConfig, Ownable, ReentrancyGuard {
    uint256 public constant MICRO_ETH_WEI = 1e12;
    uint64 public constant REWARD_MULTIPLIER = 10_000;

    struct Prediction {
        address creator;
        string title;
        uint8 optionCount;
        bool ended;
        uint8 resultIndex;
        string[4] options;
        euint64[4] totalStakedMicroEth;
    }

    struct Bet {
        bool exists;
        bool claimed;
        euint8 choice;
        euint64 stakedMicroEth;
    }

    IObliviousCoin public immutable coin;

    uint256 public predictionCount;
    mapping(uint256 predictionId => Prediction) private _predictions;
    mapping(uint256 predictionId => mapping(address user => Bet)) private _bets;

    event PredictionCreated(uint256 indexed predictionId, address indexed creator, string title, uint8 optionCount);
    event BetPlaced(uint256 indexed predictionId, address indexed user);
    event PredictionEnded(uint256 indexed predictionId, uint8 resultIndex);
    event RewardClaimed(uint256 indexed predictionId, address indexed user);

    error PredictionNotFound(uint256 predictionId);
    error PredictionAlreadyEnded(uint256 predictionId);
    error PredictionNotEnded(uint256 predictionId);
    error InvalidOptionCount(uint256 optionCount);
    error InvalidResultIndex(uint8 resultIndex);
    error AlreadyBet(uint256 predictionId, address user);
    error NoBet(uint256 predictionId, address user);
    error AlreadyClaimed(uint256 predictionId, address user);
    error InvalidStakeWei(uint256 stakeWei);
    error Unauthorized(address caller);

    constructor(address coinAddress) Ownable(msg.sender) {
        coin = IObliviousCoin(coinAddress);
    }

    function createPrediction(string calldata title, string[] calldata options) external returns (uint256 predictionId) {
        if (options.length < 2 || options.length > 4) revert InvalidOptionCount(options.length);

        predictionId = ++predictionCount;
        Prediction storage p = _predictions[predictionId];
        p.creator = msg.sender;
        p.title = title;
        p.optionCount = uint8(options.length);

        for (uint256 i = 0; i < options.length; i++) {
            p.options[i] = options[i];
        }

        for (uint256 i = 0; i < 4; i++) {
            euint64 zero = FHE.asEuint64(0);
            FHE.allowThis(zero);
            p.totalStakedMicroEth[i] = zero;
        }

        emit PredictionCreated(predictionId, msg.sender, title, uint8(options.length));
    }

    function placeBet(
        uint256 predictionId,
        externalEuint8 encryptedChoice,
        bytes calldata inputProof
    ) external payable nonReentrant {
        Prediction storage p = _predictions[predictionId];
        if (p.creator == address(0)) revert PredictionNotFound(predictionId);
        if (p.ended) revert PredictionAlreadyEnded(predictionId);

        if (msg.value == 0 || msg.value % MICRO_ETH_WEI != 0) revert InvalidStakeWei(msg.value);
        uint64 stakedMicroEth = uint64(msg.value / MICRO_ETH_WEI);
        if (stakedMicroEth == 0) revert InvalidStakeWei(msg.value);

        Bet storage b = _bets[predictionId][msg.sender];
        if (b.exists) revert AlreadyBet(predictionId, msg.sender);
        b.exists = true;

        b.choice = FHE.fromExternal(encryptedChoice, inputProof);
        b.stakedMicroEth = FHE.asEuint64(stakedMicroEth);

        FHE.allowThis(b.choice);
        FHE.allow(b.choice, msg.sender);
        FHE.allowThis(b.stakedMicroEth);
        FHE.allow(b.stakedMicroEth, msg.sender);

        for (uint256 i = 0; i < p.optionCount; i++) {
            ebool isChosen = FHE.eq(b.choice, FHE.asEuint8(uint8(i)));
            euint64 updated = FHE.select(
                isChosen,
                FHE.add(p.totalStakedMicroEth[i], b.stakedMicroEth),
                p.totalStakedMicroEth[i]
            );
            FHE.allowThis(updated);
            p.totalStakedMicroEth[i] = updated;
        }

        (bool ok,) = p.creator.call{value: msg.value}("");
        require(ok, "ETH transfer failed");

        emit BetPlaced(predictionId, msg.sender);
    }

    function endPrediction(uint256 predictionId, uint8 resultIndex) external {
        Prediction storage p = _predictions[predictionId];
        if (p.creator == address(0)) revert PredictionNotFound(predictionId);
        if (p.ended) revert PredictionAlreadyEnded(predictionId);
        if (resultIndex >= p.optionCount) revert InvalidResultIndex(resultIndex);
        if (msg.sender != p.creator && msg.sender != owner()) revert Unauthorized(msg.sender);

        p.ended = true;
        p.resultIndex = resultIndex;

        for (uint256 i = 0; i < p.optionCount; i++) {
            FHE.makePubliclyDecryptable(p.totalStakedMicroEth[i]);
        }

        emit PredictionEnded(predictionId, resultIndex);
    }

    function claimReward(uint256 predictionId) external {
        Prediction storage p = _predictions[predictionId];
        if (p.creator == address(0)) revert PredictionNotFound(predictionId);
        if (!p.ended) revert PredictionNotEnded(predictionId);

        Bet storage b = _bets[predictionId][msg.sender];
        if (!b.exists) revert NoBet(predictionId, msg.sender);
        if (b.claimed) revert AlreadyClaimed(predictionId, msg.sender);
        b.claimed = true;

        ebool isWinner = FHE.eq(b.choice, FHE.asEuint8(p.resultIndex));
        euint64 baseReward = FHE.mul(b.stakedMicroEth, FHE.asEuint64(REWARD_MULTIPLIER));
        euint64 reward = FHE.select(isWinner, baseReward, FHE.asEuint64(0));

        FHE.allowTransient(reward, address(coin));
        coin.mint(msg.sender, reward);

        emit RewardClaimed(predictionId, msg.sender);
    }

    function getPrediction(
        uint256 predictionId
    )
        external
        view
        returns (address creator, string memory title, uint8 optionCount, bool ended, uint8 resultIndex)
    {
        Prediction storage p = _predictions[predictionId];
        if (p.creator == address(0)) revert PredictionNotFound(predictionId);
        return (p.creator, p.title, p.optionCount, p.ended, p.resultIndex);
    }

    function getPredictionOptions(
        uint256 predictionId
    ) external view returns (string[4] memory options, uint8 optionCount) {
        Prediction storage p = _predictions[predictionId];
        if (p.creator == address(0)) revert PredictionNotFound(predictionId);
        return (p.options, p.optionCount);
    }

    function getEncryptedTotals(
        uint256 predictionId
    ) external view returns (euint64[4] memory totals, uint8 optionCount) {
        Prediction storage p = _predictions[predictionId];
        if (p.creator == address(0)) revert PredictionNotFound(predictionId);
        return (p.totalStakedMicroEth, p.optionCount);
    }

    function getUserBet(
        uint256 predictionId,
        address user
    ) external view returns (bool exists, bool claimed, euint8 choice, euint64 stakedMicroEth) {
        Prediction storage p = _predictions[predictionId];
        if (p.creator == address(0)) revert PredictionNotFound(predictionId);

        Bet storage b = _bets[predictionId][user];
        return (b.exists, b.claimed, b.choice, b.stakedMicroEth);
    }
}
