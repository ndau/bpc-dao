# Sign Payload API Documentation

## Overview
This API allows you to request a signature from ndau wallet without saving the vote to the database. The wallet signs a custom payload and returns the signature via socket.

## Flow

```
Frontend → Backend Socket (website-sign-request-server) → Wallet (server-sign-request-app) → Backend Socket (app-sign-confirmed-server) → Frontend (server-sign-fulfilled-website)
```

## WebSocket Events

### Events Emitted by Frontend

**website-sign-request-server**
Sent to initiate a signing request.

```javascript
{
  payload: "base64_encoded_yaml",
  walletAddress: "ndau..."
}
```

### Events Received by Frontend

**server-sign-fulfilled-website**
Received when wallet successfully signs the payload.

```javascript
{
  signature: "signature_in_base58",
  payload: "original_payload"
}
```

**server-sign-rejected-website**
Received when the user rejects the signing request.

```javascript
{}
```

**server-sign-failed-website**
Received when an error occurs (e.g., wallet not connected).

```javascript
{
  message: "Wallet not connected"
}
```

### Events Emitted by Wallet (App)

**app-sign-confirmed-server**
Sent by the wallet when the user confirms the signature.

```javascript
{
  signature: "signature_in_base58",
  payload: "original_payload",
  app_socket_id: "app_socket_id"
}
```

**app-sign-rejected-server**
Sent by the wallet when the user rejects the signature.

```javascript
{
  app_socket_id: "app_socket_id"
}
```

### Events Received by Wallet (App)

**server-sign-request-app**
Sent by the backend to the wallet to request a signature.

```javascript
{
  payload: "base64_encoded_yaml",
  walletAddress: "ndau..."
}
```

---

## Usage Example (JavaScript)

### 1. Connect to Backend Socket

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected to backend:', socket.id);
});
```

### 2. Prepare the Payload

```javascript
import yaml from 'yaml';
import { getAccount } from './helpers/fetch';

const ethereumAddress = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
const walletAddress = "ndau11DD92Ab8acd3Ce5741523C447B18821e7bba8";

// Get validation key from wallet
const account = await getAccount(walletAddress);
const validationKey = account[walletAddress].validationKeys[0];

// Create the payload
const payload = {
  vote: 'yes',
  proposal: {
    proposal_id: 'ndau-to-revo-conversion',
    proposal_heading: `I agree to convert my ndau to Ethereum address: ${ethereumAddress}`,
    voting_option_id: 1,
    voting_option_heading: 'Confirm Conversion'
  },
  wallet_address: walletAddress,
  validation_key: validationKey
};

// Convert to base64
const payloadBase64 = btoa(yaml.stringify(payload));
```

### 3. Send Signing Request via Socket

```javascript
// Emit the signing request
socket.emit('website-sign-request-server', {
  payload: payloadBase64,
  walletAddress: walletAddress
});

console.log('Signature request sent');
```

### 4. Listen for Response via Socket

```javascript
// Listen for successful signature
socket.on('server-sign-fulfilled-website', ({ signature, payload }) => {
  console.log('Signature received:', signature);
  // Use the signature as needed
  displaySignature(signature);
});

// Listen for rejection
socket.on('server-sign-rejected-website', () => {
  console.log('User rejected the signature request');
  alert('Signature request rejected');
});

// Listen for errors
socket.on('server-sign-failed-website', ({ message }) => {
  console.log('Error:', message);
  alert('Failed: ' + message);
});
```

---

## Payload YAML Format

The payload must be in YAML format and then base64 encoded.

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

To convert to base64:
```javascript
const payloadBase64 = btoa(yaml.stringify(payload));
```

---

## Complete Example

```javascript
import { io } from 'socket.io-client';
import yaml from 'yaml';
import { getAccount } from './helpers/fetch';

// Connect to backend
const socket = io('http://localhost:3001');

// Function to request signature
async function requestSignature(ethereumAddress) {
  const walletAddress = "ndau11DD92Ab8acd3Ce5741523C447B18821e7bba8";

  // Get validation key
  const account = await getAccount(walletAddress);
  const validationKey = account[walletAddress].validationKeys[0];

  // Create payload
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

  // Send request
  socket.emit('website-sign-request-server', {
    payload: payloadBase64,
    walletAddress: walletAddress
  });
}

// Listen for responses
socket.on('server-sign-fulfilled-website', ({ signature }) => {
  console.log('✓ Signature received:', signature);
  // Use the signature
});

socket.on('server-sign-rejected-website', () => {
  console.log('✗ User rejected');
});

socket.on('server-sign-failed-website', ({ message }) => {
  console.log('✗ Error:', message);
});

// Usage
requestSignature("0x742d35Cc6634C0532925a3b844Bc454e4438f44e");
```

---

## Testing

### 1. Test Socket Connection

Connect to backend via WebSocket client (e.g., using browser dev tools or wscat):
```
ws://localhost:3001
```

### 2. Test Full Flow

1. Connect frontend to backend via WebSocket
2. Ensure wallet (app) is connected
3. Emit `website-sign-request-server` event with payload
4. Verify wallet receives `server-sign-request-app` event
5. Confirm signature in wallet
6. Verify frontend receives `server-sign-fulfilled-website` event

### 3. Test Error Scenarios

- **Wallet not connected**: Should receive `server-sign-failed-website`
- **User rejects**: Should receive `server-sign-rejected-website`
- **Invalid payload**: Wallet may reject or fail to sign

---

## Notes

- The signature is NOT saved to the database
- The wallet must be connected via socket.io before making a request
- The frontend and wallet must both be connected to the backend
- The payload must be base64-encoded YAML
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

### Invalid signature

Verify:
1. The payload format matches what the wallet expects
2. The validation key is correct
3. The payload is properly base64 encoded
