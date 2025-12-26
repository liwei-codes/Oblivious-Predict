# Oblivious Predict (FHEVM)

Oblivious Predict is a confidential prediction market on Sepolia that lets users create predictions, place encrypted bets, and reveal results and totals only after settlement.

## Overview

Oblivious Predict combines Fully Homomorphic Encryption (FHE) with smart contracts to keep sensitive prediction data private while remaining verifiable on-chain. Users submit encrypted choices and encrypted stake sizes. The contract aggregates encrypted totals per option and only makes totals publicly decryptable when a prediction ends. Winners can claim a confidential OBCOIN reward calculated from their stake.

## Problems This Project Solves

- Prevents early disclosure of market sentiment by keeping choices and stake sizes private.
- Reduces manipulation and front-running risk on public prediction markets.
- Lets creators run predictions without holding users' funds in the contract.
- Preserves on-chain auditability while protecting individual privacy.
- Provides a transparent, deterministic reward policy without revealing votes.

## Key Advantages

- Confidential bets: choices and stake sizes are encrypted end-to-end.
- Fair settlement: totals are only revealed after the prediction ends.
- Minimal custody: staked ETH is forwarded directly to the prediction creator.
- Deterministic rewards: winners receive `stake * 10,000` OBCOIN.
- Simple user model: one bet per user per prediction with clear claim logic.

## Core Capabilities

- Create predictions with 2 to 4 options.
- Place a single encrypted bet per prediction.
- Aggregate encrypted totals per option on-chain.
- End predictions and make totals publicly decryptable.
- Claim rewards if the encrypted choice matches the final result.

## How It Works (End-to-End Flow)

1. A creator defines a prediction title and 2-4 options.
2. A user encrypts their choice off-chain and submits it with ETH.
3. The contract stores the encrypted choice and aggregates encrypted totals.
4. When a prediction ends, encrypted totals become publicly decryptable.
5. A user claims rewards if their encrypted choice equals the result.
6. OBCOIN rewards are minted in encrypted form to the winner.

## Reward Model

- Stake unit: micro-ETH (1e12 wei). The stake must be a multiple of 1e12 wei.
- Reward formula: `reward = stake_in_micro_eth * 10,000`.
- Reward token: `ObliviousCoin (OBCOIN)`, an ERC-7984 confidential token.
- Only winners receive rewards; losers receive zero.

## Technical Stack

- Smart contracts: Solidity `^0.8.27`
- Contract framework: Hardhat + hardhat-deploy
- FHE stack: Zama FHEVM, `@fhevm/solidity` libraries
- Confidential token: OpenZeppelin `ERC7984`
- Frontend: React + Vite + TypeScript
- Wallet UX: RainbowKit + wagmi
- Reads: viem
- Writes: ethers

## Architecture and Contracts

### `ObliviousPredict`

- Stores prediction metadata, encrypted bets, and encrypted totals.
- Enforces one bet per user per prediction.
- Aggregates encrypted totals using FHE conditional logic.
- Makes totals publicly decryptable when the prediction ends.
- Authorizes settlement by prediction creator or contract owner.

### `ObliviousCoin`

- Confidential ERC-7984 token.
- Minting is restricted to the contract owner.
- Ownership is transferred to `ObliviousPredict` during deployment.

## Privacy and Access Control

- Encrypted values are stored as `euint` types.
- Users can decrypt their own encrypted choice and stake.
- Aggregated totals are made publicly decryptable after settlement.
- The contract never decrypts user choices on-chain.

## Frontend Rules and Constraints

- No Tailwind.
- No localStorage usage.
- No frontend environment variables.
- No JSON files in the frontend.
- Read calls use viem; write calls use ethers.
- The frontend targets Sepolia only and does not connect to localhost.
- Contract ABIs and addresses must be sourced from `deployments/sepolia` via the sync task.

## Project Structure

```
Oblivious-Predict/
├── contracts/           # Smart contracts
├── deploy/              # Deployment scripts
├── tasks/               # Hardhat tasks (including sync-frontend)
├── test/                # Tests
├── frontend/            # React + Vite dApp
├── docs/                # Zama integration notes
└── hardhat.config.ts    # Hardhat config
```

## Setup and Usage

### Prerequisites

- Node.js 20+
- npm
- A Sepolia-funded wallet

### Environment Variables (Hardhat Only)

Set these in `.env` for deployment and verification:

- `PRIVATE_KEY` (required, no mnemonic)
- `INFURA_API_KEY` (required for Sepolia RPC)
- `ETHERSCAN_API_KEY` (optional for verification)

### Install Dependencies

```bash
npm install
```

### Compile and Test

```bash
npx hardhat compile
npx hardhat test
```

### Run at Least One Task (before Sepolia deployment)

```bash
npx hardhat accounts
```

### Local Contract Deployment (required pre-check)

This validates deployment logic on a local Hardhat node. The frontend must still target Sepolia.

```bash
npx hardhat node
```

In a second terminal:

```bash
npx hardhat deploy --network localhost --tags Oblivious
```

### Deploy to Sepolia

```bash
npx hardhat deploy --network sepolia --tags Oblivious
```

### Sync ABIs and Addresses to the Frontend

ABIs must come from `deployments/sepolia` and are written to the TypeScript config.

```bash
npx hardhat --network sepolia sync-frontend
```

### Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

Connect a wallet on Sepolia to create predictions, place encrypted bets, and claim rewards.

## Testing

```bash
npx hardhat test
```

## Limitations and Current Assumptions

- One bet per user per prediction.
- Predictions are settled by the creator or contract owner.
- ETH stakes are forwarded to the prediction creator immediately.
- Rewards are paid in OBCOIN, not in ETH.
- Stake amounts are limited to micro-ETH granularity.

## Future Roadmap

- Add multiple bets per user with encrypted position management.
- Add creator fee controls and explicit fee disclosure in the UI.
- Introduce a pooled escrow model as an optional market type.
- Expand to multi-outcome settlement and multi-winner reward splits.
- Add indexed analytics for encrypted volume and settlement history.
- Support multi-chain deployments with configurable chain targets.
- Improve UX around encrypted inputs and decryption status.
- Add audit-focused documentation and formal verification notes.

## License

BSD-3-Clause-Clear. See `LICENSE`.
