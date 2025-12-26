import { useEffect, useState } from 'react';
import { toHex } from 'viem';
import { useAccount } from 'wagmi';

import { OBLIVIOUS_COIN_ABI, OBLIVIOUS_COIN_ADDRESS } from '../config/contracts';
import { publicClient } from '../lib/viem';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { userDecrypt } from '../lib/zama';
import { formatUnits6 } from '../lib/format';

function isZeroAddress(address: string) {
  return address.toLowerCase() === '0x0000000000000000000000000000000000000000';
}

function handleFromUint256(value: bigint): string {
  return toHex(value, { size: 32 });
}

export function WalletPanel() {
  const { address, isConnected } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const [tokenMeta, setTokenMeta] = useState<{ name: string; symbol: string } | null>(null);
  const [balanceHandle, setBalanceHandle] = useState<string | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMeta() {
      if (isZeroAddress(OBLIVIOUS_COIN_ADDRESS)) return;
      try {
        const [name, symbol] = await Promise.all([
          publicClient.readContract({
            address: OBLIVIOUS_COIN_ADDRESS,
            abi: OBLIVIOUS_COIN_ABI,
            functionName: 'name',
          }) as Promise<string>,
          publicClient.readContract({
            address: OBLIVIOUS_COIN_ADDRESS,
            abi: OBLIVIOUS_COIN_ABI,
            functionName: 'symbol',
          }) as Promise<string>,
        ]);
        if (!cancelled) setTokenMeta({ name, symbol });
      } catch {
        if (!cancelled) setTokenMeta(null);
      }
    }

    loadMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshBalanceHandle = async () => {
    setStatus(null);
    setBalance(null);
    if (!address) return;
    if (isZeroAddress(OBLIVIOUS_COIN_ADDRESS)) return;

    try {
      const handleUint = (await publicClient.readContract({
        address: OBLIVIOUS_COIN_ADDRESS,
        abi: OBLIVIOUS_COIN_ABI,
        functionName: 'confidentialBalanceOf',
        args: [address],
      })) as bigint;

      setBalanceHandle(handleFromUint256(handleUint));
    } catch (e: any) {
      setStatus(e?.shortMessage ?? e?.message ?? 'Failed to load encrypted balance handle');
      setBalanceHandle(null);
    }
  };

  const decryptBalance = async () => {
    setStatus(null);
    if (!instance) return;
    if (!balanceHandle) return;

    try {
      const signer = await signerPromise;
      if (!signer) throw new Error('Wallet not connected');

      const values = await userDecrypt(instance, signer, OBLIVIOUS_COIN_ADDRESS, [balanceHandle]);
      const clear = BigInt(values[balanceHandle] ?? 0n);
      setBalance(clear);
    } catch (e: any) {
      setStatus(e?.shortMessage ?? e?.message ?? 'Failed to decrypt balance');
    }
  };

  return (
    <section className="panel">
      <h2 className="panel-title">Wallet</h2>

      {isZeroAddress(OBLIVIOUS_COIN_ADDRESS) ? (
        <div className="notice warning">
          Contract addresses are not set. Deploy to Sepolia and run `npx hardhat --network sepolia sync-frontend`.
        </div>
      ) : null}

      {tokenMeta ? (
        <div className="notice">
          Token: {tokenMeta.name} ({tokenMeta.symbol})
        </div>
      ) : null}

      <div className="stack">
        <div className="row">
          <button className="button secondary" onClick={refreshBalanceHandle} disabled={!isConnected} type="button">
            Load encrypted balance
          </button>
          <button
            className="button"
            onClick={decryptBalance}
            disabled={!isConnected || !instance || !balanceHandle || zamaLoading}
            type="button"
          >
            Decrypt balance
          </button>
        </div>

        {balanceHandle ? <div className="mono">Balance handle: {balanceHandle}</div> : null}
        {balance !== null ? <div className="notice">Clear balance: {formatUnits6(balance)}</div> : null}

        {zamaError ? <div className="notice warning">{zamaError}</div> : null}
        {status ? <div className="notice">{status}</div> : null}
      </div>
    </section>
  );
}

