/* This file is overwritten by the Hardhat task 'sync-frontend'. */
export const SEPOLIA_CHAIN_ID = 11155111 as const;

export const OBLIVIOUS_PREDICT_ADDRESS = '0xA937268D876D217be8cA7A913b39ca1e98f6842B' as const;
export const OBLIVIOUS_COIN_ADDRESS = '0x667fc8cEd4844740DFC32Cb7b50242bC60e80Be3' as const;

export const OBLIVIOUS_PREDICT_ABI = [
  {
    inputs: [
      { internalType: 'string', name: 'title', type: 'string' },
      { internalType: 'string[]', name: 'options', type: 'string[]' },
    ],
    name: 'createPrediction',
    outputs: [{ internalType: 'uint256', name: 'predictionId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'predictionCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'predictionId', type: 'uint256' }],
    name: 'getPrediction',
    outputs: [
      { internalType: 'address', name: 'creator', type: 'address' },
      { internalType: 'string', name: 'title', type: 'string' },
      { internalType: 'uint8', name: 'optionCount', type: 'uint8' },
      { internalType: 'bool', name: 'ended', type: 'bool' },
      { internalType: 'uint8', name: 'resultIndex', type: 'uint8' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'predictionId', type: 'uint256' }],
    name: 'getPredictionOptions',
    outputs: [
      { internalType: 'string[4]', name: 'options', type: 'string[4]' },
      { internalType: 'uint8', name: 'optionCount', type: 'uint8' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'predictionId', type: 'uint256' }],
    name: 'getEncryptedTotals',
    outputs: [
      { internalType: 'euint64[4]', name: 'totals', type: 'uint256[4]' },
      { internalType: 'uint8', name: 'optionCount', type: 'uint8' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'predictionId', type: 'uint256' },
      { internalType: 'externalEuint8', name: 'encryptedChoice', type: 'bytes32' },
      { internalType: 'bytes', name: 'inputProof', type: 'bytes' },
    ],
    name: 'placeBet',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'predictionId', type: 'uint256' },
      { internalType: 'uint8', name: 'resultIndex', type: 'uint8' },
    ],
    name: 'endPrediction',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'predictionId', type: 'uint256' }],
    name: 'claimReward',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'predictionId', type: 'uint256' },
      { internalType: 'address', name: 'user', type: 'address' },
    ],
    name: 'getUserBet',
    outputs: [
      { internalType: 'bool', name: 'exists', type: 'bool' },
      { internalType: 'bool', name: 'claimed', type: 'bool' },
      { internalType: 'euint8', name: 'choice', type: 'uint256' },
      { internalType: 'euint64', name: 'stakedMicroEth', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const OBLIVIOUS_COIN_ABI = [
  { inputs: [], name: 'name', outputs: [{ internalType: 'string', name: '', type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'symbol', outputs: [{ internalType: 'string', name: '', type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'decimals', outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }], stateMutability: 'view', type: 'function' },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'confidentialBalanceOf',
    outputs: [{ internalType: 'euint64', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

