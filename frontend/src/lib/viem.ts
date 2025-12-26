import { createPublicClient, custom, http } from 'viem';
import { sepolia } from 'viem/chains';

function getTransport() {
  if (typeof window === 'undefined') return http();
  const eth = (window as any).ethereum;
  if (eth) return custom(eth);
  return http();
}

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: getTransport(),
});

