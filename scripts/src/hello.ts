import WebSocket from 'ws';

const token = process.env.DERIV_API_TOKEN;

if (!token) {
  console.log("❌ Error: DERIV_API_TOKEN is missing in your Replit Secrets!");
  process.exit(1);
}

console.log("🔄 Connecting to Deriv Demo Account...");

const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');

ws.on('open', () => {
  console.log("✅ Connected to Deriv server! Sending token verification...");
  ws.send(JSON.stringify({ authorize: token }));
});

ws.on('message', (data: any) => {
  const response = JSON.parse(data.toString());

  if (response.error) {
    console.log(`❌ Connection Failed: ${response.error.message}`);
    ws.close();
  } else if (response.msg_type === 'authorize') {
    console.log("🎉 SUCCESS! Your Deriv connection is fully working!");
    console.log(`👤 Account Email: ${response.authorize.email}`);
    console.log(`💰 Demo Balance: $${response.authorize.balance}`);
    ws.close();
  }
});

ws.on('error', (error) => {
  console.log(`❌ WebSocket Error: ${error.message}`);
});