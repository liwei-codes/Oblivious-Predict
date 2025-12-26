import { useEffect, useMemo, useState } from 'react';
import { Contract, parseEther } from 'ethers';
import { useAccount } from 'wagmi';
import { toHex } from 'viem';

import { OBLIVIOUS_PREDICT_ABI, OBLIVIOUS_PREDICT_ADDRESS } from '../config/contracts';
import { publicClient } from '../lib/viem';
import { publicDecrypt, userDecrypt } from '../lib/zama';
import { formatMicroEth, formatUnits6 } from '../lib/format';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { useEthersSigner } from '../hooks/useEthersSigner';

export type PredictionView = {
  id: bigint;
  creator: string;
  title: string;
  optionCount: number;
  ended: boolean;
  resultIndex: number;
  options: string[];
  totalHandles: string[];
};

type Props = {
  prediction: PredictionView;
  onMutated: () => void;
};

function handleFromUint256(value: bigint): string {
  return toHex(value, { size: 32 });
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function PredictionCard({ prediction, onMutated }: Props) {
  const { address, isConnected } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const [stakeEth, setStakeEth] = useState('0.000002');
  const [selectedOption, setSelectedOption] = useState(0);
  const [endResult, setEndResult] = useState(0);
  const [status, setStatus] = useState<string | null>(null);

  const [totalsClear, setTotalsClear] = useState<bigint[] | null>(null);
  const [decryptingTotals, setDecryptingTotals] = useState(false);

  const [betExists, setBetExists] = useState(false);
  const [betClaimed, setBetClaimed] = useState(false);
  const [betChoiceHandle, setBetChoiceHandle] = useState<string | null>(null);
  const [betStakeHandle, setBetStakeHandle] = useState<string | null>(null);
  const [betDecrypted, setBetDecrypted] = useState<{ choice: number; stakedMicroEth: bigint } | null>(null);
  const [decryptingBet, setDecryptingBet] = useState(false);

  const isCreator = useMemo(() => {
    if (!address) return false;
    return prediction.creator.toLowerCase() === address.toLowerCase();
  }, [address, prediction.creator]);

  useEffect(() => {
    setEndResult(prediction.resultIndex ?? 0);
  }, [prediction.resultIndex]);

  useEffect(() => {
    let cancelled = false;

    async function loadBet() {
      setBetDecrypted(null);
      if (!address) {
        setBetExists(false);
        setBetClaimed(false);
        setBetChoiceHandle(null);
        setBetStakeHandle(null);
        return;
      }

      try {
        const [exists, claimed, choice, stakedMicroEth] = (await publicClient.readContract({
          address: OBLIVIOUS_PREDICT_ADDRESS,
          abi: OBLIVIOUS_PREDICT_ABI,
          functionName: 'getUserBet',
          args: [prediction.id, address],
        })) as any;

        if (cancelled) return;

        setBetExists(Boolean(exists));
        setBetClaimed(Boolean(claimed));
        setBetChoiceHandle(handleFromUint256(choice as bigint));
        setBetStakeHandle(handleFromUint256(stakedMicroEth as bigint));
      } catch {
        if (!cancelled) {
          setBetExists(false);
          setBetClaimed(false);
          setBetChoiceHandle(null);
          setBetStakeHandle(null);
        }
      }
    }

    loadBet();
    return () => {
      cancelled = true;
    };
  }, [address, prediction.id]);

  const decryptTotals = async () => {
    if (!instance) return;
    setStatus(null);
    setDecryptingTotals(true);
    try {
      const values = await publicDecrypt(instance, prediction.totalHandles);
      const next = prediction.totalHandles.map((h) => BigInt(values[h] ?? 0n));
      setTotalsClear(next);
    } catch (e: any) {
      setStatus(e?.message ?? 'Failed to decrypt totals');
    } finally {
      setDecryptingTotals(false);
    }
  };

  const decryptMyBet = async () => {
    if (!instance) return;
    if (!betChoiceHandle || !betStakeHandle) return;
    setStatus(null);
    setDecryptingBet(true);

    try {
      const signer = await signerPromise;
      if (!signer) throw new Error('Wallet not connected');
      const values = await userDecrypt(instance, signer, OBLIVIOUS_PREDICT_ADDRESS, [betChoiceHandle, betStakeHandle]);
      const choice = Number(values[betChoiceHandle]);
      const stakedMicroEth = BigInt(values[betStakeHandle]);
      setBetDecrypted({ choice, stakedMicroEth });
    } catch (e: any) {
      setStatus(e?.shortMessage ?? e?.message ?? 'Failed to decrypt bet');
    } finally {
      setDecryptingBet(false);
    }
  };

  const placeBet = async () => {
    setStatus(null);
    if (!isConnected || !address) return;
    if (!instance) return;
    if (prediction.ended) return;

    try {
      const stakeWei = parseEther(stakeEth);
      const step = 1_000_000_000_000n;
      if (stakeWei <= 0n || stakeWei % step !== 0n) {
        throw new Error('Stake must be a multiple of 0.000001 ETH');
      }

      const signer = await signerPromise;
      if (!signer) throw new Error('Wallet not connected');

      const input = instance.createEncryptedInput(OBLIVIOUS_PREDICT_ADDRESS, address);
      input.add8(BigInt(selectedOption));
      const encrypted = await input.encrypt();

      const contract = new Contract(OBLIVIOUS_PREDICT_ADDRESS, OBLIVIOUS_PREDICT_ABI, signer);
      const tx = await contract.placeBet(prediction.id, encrypted.handles[0], encrypted.inputProof, { value: stakeWei });
      setStatus('Transaction sent. Waiting for confirmation…');
      await tx.wait();
      setStatus('Bet placed.');
      onMutated();
    } catch (e: any) {
      setStatus(e?.shortMessage ?? e?.message ?? 'Failed to place bet');
    }
  };

  const endPrediction = async () => {
    setStatus(null);
    if (!isConnected) return;
    if (prediction.ended) return;

    try {
      const signer = await signerPromise;
      if (!signer) throw new Error('Wallet not connected');

      const contract = new Contract(OBLIVIOUS_PREDICT_ADDRESS, OBLIVIOUS_PREDICT_ABI, signer);
      const tx = await contract.endPrediction(prediction.id, endResult);
      setStatus('Transaction sent. Waiting for confirmation…');
      await tx.wait();
      setStatus('Prediction ended.');
      onMutated();
    } catch (e: any) {
      setStatus(e?.shortMessage ?? e?.message ?? 'Failed to end prediction');
    }
  };

  const claimReward = async () => {
    setStatus(null);
    if (!isConnected) return;
    if (!prediction.ended) return;

    try {
      const signer = await signerPromise;
      if (!signer) throw new Error('Wallet not connected');

      const contract = new Contract(OBLIVIOUS_PREDICT_ADDRESS, OBLIVIOUS_PREDICT_ABI, signer);
      const tx = await contract.claimReward(prediction.id);
      setStatus('Transaction sent. Waiting for confirmation…');
      await tx.wait();
      setStatus('Reward claimed (if you predicted correctly).');
      onMutated();
    } catch (e: any) {
      setStatus(e?.shortMessage ?? e?.message ?? 'Failed to claim reward');
    }
  };

  return (
    <article className="card">
      <div className="row space-between">
        <div>
          <div className="muted">#{prediction.id.toString()}</div>
          <div className="card-title">{prediction.title}</div>
          <div className="muted">
            Creator: {shortAddr(prediction.creator)} {prediction.ended ? '• Ended' : '• Open'}
          </div>
        </div>
        {prediction.ended ? <span className="pill">Result: {prediction.options[prediction.resultIndex] ?? '—'}</span> : null}
      </div>

      <div className="stack">
        <div className="grid">
          {prediction.options.map((opt, i) => (
            <div key={i} className={prediction.ended && i === prediction.resultIndex ? 'option option-win' : 'option'}>
              <div className="option-name">
                {i + 1}. {opt}
              </div>
              <div className="option-meta">
                {totalsClear ? (
                  <span>Total: {formatMicroEth(totalsClear[i] ?? 0n)}</span>
                ) : (
                  <span className="mono">Handle: {prediction.totalHandles[i]}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {prediction.ended ? (
          <div className="row">
            <button className="button secondary" onClick={decryptTotals} disabled={!instance || decryptingTotals} type="button">
              {decryptingTotals ? 'Decrypting…' : 'Decrypt totals'}
            </button>
          </div>
        ) : null}

        {!prediction.ended ? (
          <div className="stack">
            <div className="row">
              <label className="field inline">
                <span className="label">Option</span>
                <select
                  className="input"
                  value={selectedOption}
                  onChange={(e) => setSelectedOption(Number(e.target.value))}
                  disabled={!isConnected || betExists}
                >
                  {prediction.options.map((opt, i) => (
                    <option key={i} value={i}>
                      {i + 1}. {opt}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field inline">
                <span className="label">Stake (ETH)</span>
                <input
                  className="input"
                  value={stakeEth}
                  onChange={(e) => setStakeEth(e.target.value)}
                  placeholder="0.000002"
                  disabled={!isConnected || betExists}
                />
              </label>

              <button className="button" onClick={placeBet} disabled={!isConnected || !instance || betExists || zamaLoading} type="button">
                {betExists ? 'Bet placed' : 'Place bet'}
              </button>
            </div>

            <div className="muted">
              Choice is encrypted. Stake is recorded as encrypted micro-ETH units (0.000001 ETH steps).
            </div>

            {zamaError ? <div className="notice warning">{zamaError}</div> : null}
          </div>
        ) : null}

        {prediction.ended && betExists ? (
          <div className="stack">
            <div className="row">
              <button className="button" onClick={claimReward} disabled={!isConnected || betClaimed} type="button">
                {betClaimed ? 'Reward claimed' : 'Claim reward'}
              </button>
              <button className="button secondary" onClick={decryptMyBet} disabled={!instance || decryptingBet} type="button">
                {decryptingBet ? 'Decrypting…' : 'Decrypt my bet'}
              </button>
            </div>

            {betDecrypted ? (
              <div className="notice">
                Your decrypted bet: option {betDecrypted.choice + 1} • stake {formatMicroEth(betDecrypted.stakedMicroEth)} •
                reward units {formatUnits6(betDecrypted.stakedMicroEth * 10_000n)}
              </div>
            ) : null}
          </div>
        ) : null}

        {isCreator && !prediction.ended ? (
          <div className="stack">
            <div className="row">
              <label className="field inline">
                <span className="label">Result</span>
                <select className="input" value={endResult} onChange={(e) => setEndResult(Number(e.target.value))}>
                  {prediction.options.map((opt, i) => (
                    <option key={i} value={i}>
                      {i + 1}. {opt}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button danger" onClick={endPrediction} type="button">
                End prediction
              </button>
            </div>
          </div>
        ) : null}

        {status ? <div className="notice">{status}</div> : null}
      </div>
    </article>
  );
}
