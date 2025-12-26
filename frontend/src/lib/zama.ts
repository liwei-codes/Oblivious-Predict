import type { FhevmInstance } from '@zama-fhe/relayer-sdk/bundle';
import type { Signer } from 'ethers';

type HandleContractPair = {
  handle: string;
  contractAddress: string;
};

export async function userDecrypt(
  instance: FhevmInstance,
  signer: Signer,
  contractAddress: string,
  handles: string[],
): Promise<Record<string, any>> {
  const address = await signer.getAddress();
  const keypair = instance.generateKeypair();

  const handleContractPairs: HandleContractPair[] = handles.map((handle) => ({ handle, contractAddress }));
  const startTimeStamp = Math.floor(Date.now() / 1000).toString();
  const durationDays = '10';
  const contractAddresses = [contractAddress];

  const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);

  const signature = await signer.signTypedData(
    eip712.domain,
    { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
    eip712.message,
  );

  return await instance.userDecrypt(
    handleContractPairs,
    keypair.privateKey,
    keypair.publicKey,
    signature.replace('0x', ''),
    contractAddresses,
    address,
    startTimeStamp,
    durationDays,
  );
}

export async function publicDecrypt(instance: FhevmInstance, handles: string[]): Promise<Record<string, any>> {
  const { clearValues } = await instance.publicDecrypt(handles);
  return clearValues;
}

