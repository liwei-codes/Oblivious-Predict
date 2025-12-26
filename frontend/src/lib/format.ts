import { formatUnits } from 'ethers';

export function formatUnits6(value: bigint): string {
  return formatUnits(value, 6);
}

export function formatMicroEth(valueMicroEth: bigint): string {
  return `${formatUnits6(valueMicroEth)} ETH`;
}

