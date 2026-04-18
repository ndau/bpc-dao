# Sign Payload API Documentation

## Overview

This API allows you to request a signature from the ndau wallet without saving the vote to the database. The wallet signs a custom payload and returns the signature via socket.

The payload uses the same structure as a vote so the wallet app can display it using its existing vote confirmation UI. The backend decodes the payload, extracts the vote data, and forwards it to the wallet as a vote request. When the wallet confirms, the backend detects that this is a sign-payload request (by checking if `proposal_id` is non-numeric) and returns the signature without saving to the database.

## Flow

```
Frontend → Backend (website-sign-request-server)
  → Backend decodes base64 YAML payload, extracts vote data
  → Wallet (server-create_vote-request-app)
  → Backend (appCreateVoteConfirmedServer)
  → Backend detects non-numeric proposal_id, skips DB save
  → Frontend (server-sign-fulfilled-website)
```

## Flow Diagram

```
┌─────────────┐         ┌───────────┐         ┌───────────┐         ┌─────────────┐
│   Frontend  │         │  Backend   │         │  Wallet   │         │   Backend   │
│             │────────▶│            │────────▶│   App     │────────▶│            │
└─────────────┘         └───────────┘         └───────────┘         └─────────────┘
      │                       │                       │                       │
      │ (1)                   │ (2)                   │ (3)                  │ (4)
      ▼                       ▼                       ▼                       ▼
  Emit:               Decode payload,         Sign &                 Check proposal_id,
  website-            extract vote data,      confirm                skip DB save,
  sign-request-       emit:                                         return to
  server              server-create_                                frontend via
                      vote-request-app                              server-sign-
                                                                   fulfilled-
                                                                   website
```

---

## WebSocket Events Reference

| Direction | Event Name | Payload | Purpose |
|-----------|-----------|---------|---------|
| Frontend → Backend | `website-sign-request-server` | `{ payload, walletAddress }` | Request signature with base64 YAML payload |
| Backend → Wallet | `server-create_vote-request-app` | `{ proposal_heading, proposal_id, voting_option_id, voting_option_heading }` | Forward as vote request to wallet |
| Wallet → Backend | `appCreateVoteConfirmedServer` | `{ proposal_id, voting_option_id, wallet_address, signature, app_socket_id, ... }` | Wallet confirmed signature |
| Wallet → Backend | `app-create_vote-rejected-server` | `{ app_socket_id, ... }` | User rejected |
| Backend → Frontend | `server-sign-fulfilled-website` | `{ signature, payload }` | Return signature to frontend |
| Backend → Frontend | `server-sign-rejected-website` | `{}` | User rejected notification |
| Backend → Frontend | `server-sign-failed-website` | `{ message }` | Error (e.g., wallet not connected) |

---

## Payload YAML Format

The payload must be in YAML format and then base64 encoded. It uses the same structure as a vote.

```yaml
vote: yes
proposal:
  proposal_id: ndau-to-revo-conversion
  proposal_heading: "I agree to convert my ndau to the Ethereum address: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
  voting_option_id: 1
  voting_option_heading: "Confirm Conversion"
wallet_address: ndau11DD92Ab8acd3Ce5741523C447B18821e7bba8
validation_key: npuba4jaftckeeb...
```

The `proposal_id` **must be non-numeric** (e.g., `ndau-to-revo-conversion`) so the backend can differentiate sign-payload requests from real votes. Real votes have numeric `proposal_id` values from the database.

---

## Step-by-Step Guide

### 1. Connect to Backend Socket

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected to backend, socket ID:', socket.id);
});
```

### 2. Prepare the Payload

```javascript
import yaml from 'yaml';
import { getAccount } from './helpers/fetch';

const ethereumAddress = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
const walletAddress = "ndau11DD92Ab8acd3Ce5741523C447B18821e7bba8";

const account = await getAccount(walletAddress);
const validationKey = account[walletAddress].validationKeys[0];

const payload = {
  vote: 'yes',
  proposal: {
    proposal_id: 'ndau-to-revo-conversion',
    proposal_heading: `I agree to convert my ndau to the Ethereum address: ${ethereumAddress}`,
    voting_option_id: 1,
    voting_option_heading: 'Confirm Conversion'
  },
  wallet_address: walletAddress,
  validation_key: validationKey
};

const payloadBase64 = btoa(yaml.stringify(payload));
```

### 3. Send Signing Request

```javascript
socket.emit('website-sign-request-server', {
  payload: payloadBase64,
  walletAddress: walletAddress
});
```

**What happens on the backend:**
1. Receives `{ payload, walletAddress }`
2. Decodes the base64 YAML payload
3. Extracts `{ proposal_heading, proposal_id, voting_option_id, voting_option_heading }`
4. Stores the original payload mapped to the app socket ID
5. Emits `server-create_vote-request-app` to the wallet app with the extracted vote data

### 4. Listen for Response

```javascript
socket.on('server-sign-fulfilled-website', ({ signature, payload }) => {
  console.log('Signature received:', signature);
  displaySignature(signature);
});

socket.on('server-sign-rejected-website', () => {
  console.log('User rejected the signature request');
  alert('Signature request rejected');
});

socket.on('server-sign-failed-website', ({ message }) => {
  console.log('Error:', message);
  alert('Failed: ' + message);
});
```

---

## Complete Example

```javascript
import { io } from 'socket.io-client';
import yaml from 'yaml';
import { getAccount } from './helpers/fetch';

const socket = io('http://localhost:3001');

async function requestSignature(ethereumAddress) {
  const walletAddress = "ndau11DD92Ab8acd3Ce5741523C447B18821e7bba8";

  const account = await getAccount(walletAddress);
  const validationKey = account[walletAddress].validationKeys[0];

  const payload = {
    vote: 'yes',
    proposal: {
      proposal_id: 'ndau-to-revo-conversion',
      proposal_heading: `I agree to convert my ndau to the Ethereum address: ${ethereumAddress}`,
      voting_option_id: 1,
      voting_option_heading: 'Confirm Conversion'
    },
    wallet_address: walletAddress,
    validation_key: validationKey
  };

  const payloadBase64 = btoa(yaml.stringify(payload));

  socket.emit('website-sign-request-server', {
    payload: payloadBase64,
    walletAddress: walletAddress
  });
}

socket.on('server-sign-fulfilled-website', ({ signature, payload }) => {
  console.log('Signature received:', signature);
});

socket.on('server-sign-rejected-website', () => {
  console.log('User rejected');
});

socket.on('server-sign-failed-website', ({ message }) => {
  console.log('Error:', message);
});

requestSignature("0x742d35Cc6634C0532925a3b844Bc454e4438f44e");
```

---

## How It Works (Backend)

When the backend receives `website-sign-request-server`:

1. Decodes the base64 YAML payload
2. Extracts vote data: `{ proposal_heading, proposal_id, voting_option_id, voting_option_heading }`
3. Stores the original payload in a `signPayloadMap` keyed by `appSocketId`
4. Emits `server-create_vote-request-app` to the wallet app

When the wallet confirms via `appCreateVoteConfirmedServer`:

1. Checks if `proposal_id` is non-numeric (sign-payload) using `isNaN(Number(proposal_id))`
2. If sign-payload: returns `{ signature, payload }` to the frontend via `server-sign-fulfilled-website` **without saving to the database**
3. If real vote: proceeds with normal vote flow (saves to database)

When the wallet rejects via `app-create_vote-rejected-server`:

1. Checks if there's a pending sign-payload in `signPayloadMap`
2. If yes: sends `server-sign-rejected-website` to the frontend
3. If no: proceeds with normal vote rejection flow

---

## Testing

### 1. Test Socket Connection

```
ws://localhost:3001
```

### 2. Test Full Flow

1. Connect frontend to backend via WebSocket
2. Ensure wallet (app) is connected
3. Emit `website-sign-request-server` with base64 YAML payload
4. Verify wallet receives `server-create_vote-request-app` event
5. Confirm signature in wallet
6. Verify frontend receives `server-sign-fulfilled-website` event

### 3. Test Error Scenarios

- **Wallet not connected**: Should receive `server-sign-failed-website`
- **User rejects**: Should receive `server-sign-rejected-website`
- **Invalid payload**: Wallet may reject or fail to sign

---

## Notes

- The signature is **NOT** saved to the database
- The wallet must be connected via socket.io before making a request
- The frontend and wallet must both be connected to the backend
- The payload must be base64-encoded YAML
- The `proposal_id` must be non-numeric to be treated as a sign-payload (not a real vote)
- The signature is returned in the ndau base58 format
- No HTTP endpoint is used; all communication is via WebSocket

---

## Troubleshooting

### "Wallet not connected" error

Ensure that:
1. The wallet (app) is connected to the backend
2. The frontend socket is connected
3. The socket mapping is correctly established

### No signature received

Check:
1. Browser console for WebSocket errors
2. Backend server logs for socket events
3. Wallet connection status
4. That the event name is exactly `website-sign-request-server`
5. That the payload is valid base64-encoded YAML with the correct structure

### Invalid signature

Verify:
1. The payload format matches what the wallet expects
2. The validation key is correct
3. The payload is properly base64 encoded

---

## How to Verify a Signature

After receiving a signature, you may want to verify that a specific text was actually signed by a specific wallet address.

### Backend Verification (Recommended)

```javascript
import { ndauSignatureToBytes } from '../utils/signature';
import { ndauPubkeyToBytes } from '../utils/public_key';

const account = await getAccount(walletAddress);
const ndauPubkey = account[walletAddress].validationKeys[0];

const originalPayload = atob(payloadBase64);

const [sign, err] = ndauSignatureToBytes(signature);
if (err !== null) {
  console.error('Invalid signature format');
  return false;
}

const [pk, _] = ndauPubkeyToBytes(ndauPubkey);

let isValid = false;

if (sign.algorithm === 'Ed25519') {
  const ed = require('@noble/ed25519');
  const hexPayload = Buffer.from(originalPayload).toString('hex');
  isValid = await ed.verify(sign.data, hexPayload, pk.key);
} else if (sign.algorithm === 'Secp256k1') {
  const secp256k1 = require('@noble/secp256k1');
  const crypto = require('crypto');
  const bytePayload = new Uint8Array(Buffer.from(originalPayload));
  const hashPayload = crypto.createHash('sha256').update(bytePayload).digest();
  isValid = await secp256k1.verify(sign.data, hashPayload, pk.key);
} else {
  console.error('Unsupported signature algorithm:', sign.algorithm);
  return false;
}

console.log('Signature valid:', isValid);
```

### What Verification Checks

| Check | Description |
|-------|-------------|
| Signature format | Verifies the signature is in valid ndau format |
| Public key match | Confirms the signature was created with this wallet's public key |
| Payload integrity | Ensures the payload hasn't been modified |
| Algorithm compatibility | Confirms correct crypto algorithm (Ed25519 or Secp256k1) |
