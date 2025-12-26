import { useCallback, useEffect, useState } from 'react';
import { toHex } from 'viem';

import { publicClient } from '../lib/viem';
import { OBLIVIOUS_PREDICT_ABI, OBLIVIOUS_PREDICT_ADDRESS } from '../config/contracts';
import { PredictionCard, type PredictionView } from './PredictionCard';

function isZeroAddress(address: string) {
  return address.toLowerCase() === '0x0000000000000000000000000000000000000000';
}

function handleFromUint256(value: bigint): string {
  return toHex(value, { size: 32 });
}

export function Predictions() {
  const [items, setItems] = useState<PredictionView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (isZeroAddress(OBLIVIOUS_PREDICT_ADDRESS)) return;
    setLoading(true);
    setError(null);

    try {
      const count = (await publicClient.readContract({
        address: OBLIVIOUS_PREDICT_ADDRESS,
        abi: OBLIVIOUS_PREDICT_ABI,
        functionName: 'predictionCount',
      })) as bigint;

      const next: PredictionView[] = [];
      for (let i = 1n; i <= count; i++) {
        const [creator, title, optionCount, ended, resultIndex] = (await publicClient.readContract({
          address: OBLIVIOUS_PREDICT_ADDRESS,
          abi: OBLIVIOUS_PREDICT_ABI,
          functionName: 'getPrediction',
          args: [i],
        })) as any;

        const [optionsArray, optionsCount] = (await publicClient.readContract({
          address: OBLIVIOUS_PREDICT_ADDRESS,
          abi: OBLIVIOUS_PREDICT_ABI,
          functionName: 'getPredictionOptions',
          args: [i],
        })) as any;

        const [totalsArray] = (await publicClient.readContract({
          address: OBLIVIOUS_PREDICT_ADDRESS,
          abi: OBLIVIOUS_PREDICT_ABI,
          functionName: 'getEncryptedTotals',
          args: [i],
        })) as any;

        const n = Number(optionsCount ?? optionCount ?? 0);
        const options = (optionsArray as string[]).slice(0, n);
        const totalHandles = (totalsArray as bigint[]).slice(0, n).map(handleFromUint256);

        next.push({
          id: i,
          creator,
          title,
          optionCount: n,
          ended,
          resultIndex: Number(resultIndex),
          options,
          totalHandles,
        });
      }

      next.reverse();
      setItems(next);
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? 'Failed to load predictions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (isZeroAddress(OBLIVIOUS_PREDICT_ADDRESS)) {
    return (
      <section className="panel">
        <h2 className="panel-title">Predictions</h2>
        <div className="notice warning">
          Contract addresses are not set. Deploy to Sepolia and run `npx hardhat --network sepolia sync-frontend`.
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="row space-between">
        <h2 className="panel-title">Predictions</h2>
        <button className="button secondary" onClick={refresh} type="button" disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error ? <div className="notice warning">{error}</div> : null}
      {items.length === 0 && !loading ? <div className="notice">No predictions yet.</div> : null}

      <div className="stack">
        {items.map((p) => (
          <PredictionCard key={p.id.toString()} prediction={p} onMutated={refresh} />
        ))}
      </div>
    </section>
  );
}

