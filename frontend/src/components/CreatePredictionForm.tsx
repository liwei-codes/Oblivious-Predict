import { useMemo, useState } from 'react';
import { Contract } from 'ethers';
import { useAccount } from 'wagmi';

import { OBLIVIOUS_PREDICT_ABI, OBLIVIOUS_PREDICT_ADDRESS } from '../config/contracts';
import { useEthersSigner } from '../hooks/useEthersSigner';

function isZeroAddress(address: string) {
  return address.toLowerCase() === '0x0000000000000000000000000000000000000000';
}

export function CreatePredictionForm() {
  const { isConnected } = useAccount();
  const signerPromise = useEthersSigner();

  const [title, setTitle] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    if (!isConnected) return false;
    if (!title.trim()) return false;
    if (options.length < 2 || options.length > 4) return false;
    if (options.some((o) => !o.trim())) return false;
    if (isZeroAddress(OBLIVIOUS_PREDICT_ADDRESS)) return false;
    return true;
  }, [isConnected, options, title]);

  const addOption = () => {
    if (options.length >= 4) return;
    setOptions((prev) => [...prev, '']);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  };

  const submit = async () => {
    setStatus(null);
    if (!canSubmit) return;
    setIsSubmitting(true);

    try {
      const signer = await signerPromise;
      if (!signer) throw new Error('Wallet not connected');

      const contract = new Contract(OBLIVIOUS_PREDICT_ADDRESS, OBLIVIOUS_PREDICT_ABI, signer);
      const cleanTitle = title.trim();
      const cleanOptions = options.map((o) => o.trim());

      const tx = await contract.createPrediction(cleanTitle, cleanOptions);
      setStatus('Transaction sent. Waiting for confirmation…');
      await tx.wait();
      setStatus('Prediction created.');
      setTitle('');
      setOptions(['', '']);
    } catch (e: any) {
      setStatus(e?.shortMessage ?? e?.message ?? 'Failed to create prediction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="panel">
      <h2 className="panel-title">Create a Prediction</h2>

      {isZeroAddress(OBLIVIOUS_PREDICT_ADDRESS) ? (
        <div className="notice warning">
          Contract addresses are not set. Deploy to Sepolia and run `npx hardhat --network sepolia sync-frontend`.
        </div>
      ) : null}

      <label className="field">
        <span className="label">Title</span>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Example: Will BTC close above 100k this week?"
        />
      </label>

      <div className="field">
        <span className="label">Options (2–4)</span>
        <div className="stack">
          {options.map((opt, i) => (
            <div key={i} className="row">
              <input
                className="input"
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
              />
              {options.length > 2 ? (
                <button className="button secondary" onClick={() => removeOption(i)} type="button">
                  Remove
                </button>
              ) : null}
            </div>
          ))}
          <div className="row">
            <button className="button secondary" onClick={addOption} type="button" disabled={options.length >= 4}>
              Add option
            </button>
          </div>
        </div>
      </div>

      <div className="row">
        <button className="button" onClick={submit} disabled={!canSubmit || isSubmitting} type="button">
          {isSubmitting ? 'Creating…' : 'Create'}
        </button>
      </div>

      {status ? <div className="notice">{status}</div> : null}
    </section>
  );
}

