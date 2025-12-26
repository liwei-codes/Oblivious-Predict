import { useMemo, useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { sepolia } from 'wagmi/chains';

import { Header } from './Header';
import { CreatePredictionForm } from './CreatePredictionForm';
import { Predictions } from './Predictions';
import { WalletPanel } from './WalletPanel';

type Tab = 'predictions' | 'create' | 'wallet';

export function PredictApp() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const [tab, setTab] = useState<Tab>('predictions');

  const networkWarning = useMemo(() => {
    if (!isConnected) return null;
    if (chainId !== sepolia.id) return 'Please switch your wallet network to Sepolia.';
    return null;
  }, [chainId, isConnected]);

  return (
    <div className="app">
      <Header />
      <main className="container">
        <div className="tabs">
          <button className={tab === 'predictions' ? 'tab active' : 'tab'} onClick={() => setTab('predictions')}>
            Predictions
          </button>
          <button className={tab === 'create' ? 'tab active' : 'tab'} onClick={() => setTab('create')}>
            Create
          </button>
          <button className={tab === 'wallet' ? 'tab active' : 'tab'} onClick={() => setTab('wallet')}>
            Wallet
          </button>
        </div>

        {networkWarning ? <div className="notice warning">{networkWarning}</div> : null}

        {tab === 'predictions' ? <Predictions /> : null}
        {tab === 'create' ? <CreatePredictionForm /> : null}
        {tab === 'wallet' ? <WalletPanel /> : null}
      </main>
    </div>
  );
}

