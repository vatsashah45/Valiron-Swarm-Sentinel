import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { ValironIdentity } from "../adapters/valiron.js";

/** Only address, challenge, and signature leave the process; private keys do not. */
export async function enrollDemoAgents(identity: ValironIdentity) {
  const sessions = [];
  for (let index = 0; index < 3; index++) {
    const account = privateKeyToAccount(generatePrivateKey());
    const { challenge } = await identity.challenge(account.address);
    const signature = await account.signMessage({ message: challenge });
    sessions.push(
      await identity.verify({
        agentAddress: account.address,
        challenge,
        signature,
      }),
    );
  }
  return sessions;
}
