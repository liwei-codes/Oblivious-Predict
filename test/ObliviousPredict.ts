import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { ObliviousCoin, ObliviousPredict } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

describe("ObliviousPredict", function () {
  let signers: Signers;
  let coin: ObliviousCoin;
  let predict: ObliviousPredict;
  let coinAddress: string;
  let predictAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    const coinFactory = await ethers.getContractFactory("ObliviousCoin");
    coin = (await coinFactory.connect(signers.deployer).deploy(signers.deployer.address)) as ObliviousCoin;
    coinAddress = await coin.getAddress();

    const predictFactory = await ethers.getContractFactory("ObliviousPredict");
    predict = (await predictFactory.connect(signers.deployer).deploy(coinAddress)) as ObliviousPredict;
    predictAddress = await predict.getAddress();

    await (await coin.connect(signers.deployer).transferOwnership(predictAddress)).wait();
  });

  it("creates, bets, ends, decrypts totals, and mints rewards", async function () {
    const txCreate = await predict
      .connect(signers.deployer)
      .createPrediction("Will it rain tomorrow?", ["Yes", "No"]);
    await txCreate.wait();
    const predictionId = await predict.predictionCount();

    const aliceChoice = await fhevm
      .createEncryptedInput(predictAddress, signers.alice.address)
      .add8(0)
      .encrypt();

    const bobChoice = await fhevm
      .createEncryptedInput(predictAddress, signers.bob.address)
      .add8(1)
      .encrypt();

    const aliceStakeWei = 2_000_000_000_000n; // 2 micro-ETH
    const bobStakeWei = 3_000_000_000_000n; // 3 micro-ETH

    await (
      await predict
        .connect(signers.alice)
        .placeBet(predictionId, aliceChoice.handles[0], aliceChoice.inputProof, { value: aliceStakeWei })
    ).wait();

    await (
      await predict
        .connect(signers.bob)
        .placeBet(predictionId, bobChoice.handles[0], bobChoice.inputProof, { value: bobStakeWei })
    ).wait();

    await (await predict.connect(signers.deployer).endPrediction(predictionId, 0)).wait();

    const totals = await predict.getEncryptedTotals(predictionId);
    const totalsHandle0 = totals[0][0];
    const totalsHandle1 = totals[0][1];

    const clearTotal0 = await fhevm.publicDecryptEuint(FhevmType.euint64, totalsHandle0);
    const clearTotal1 = await fhevm.publicDecryptEuint(FhevmType.euint64, totalsHandle1);

    expect(clearTotal0).to.eq(2n);
    expect(clearTotal1).to.eq(3n);

    await (await predict.connect(signers.alice).claimReward(predictionId)).wait();
    await (await predict.connect(signers.bob).claimReward(predictionId)).wait();

    const aliceBalanceHandle = await coin.confidentialBalanceOf(signers.alice.address);
    const bobBalanceHandle = await coin.confidentialBalanceOf(signers.bob.address);

    const aliceBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      aliceBalanceHandle,
      coinAddress,
      signers.alice,
    );
    const bobBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      bobBalanceHandle,
      coinAddress,
      signers.bob,
    );

    expect(aliceBalance).to.eq(20_000n);
    expect(bobBalance).to.eq(0n);

    await expect(predict.connect(signers.alice).claimReward(predictionId)).to.be.reverted;
  });
});

