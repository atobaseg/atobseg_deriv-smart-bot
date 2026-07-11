import WebSocket from 'ws';

const token = process.env.DERIV_API_TOKEN;
const appId = process.env.DERIV_APP_ID;

if (!token) {
  console.log("❌ Error: DERIV_API_TOKEN is missing in your Replit Secrets!");
  process.exit(1);
}

if (!appId) {
  console.log("❌ Error: DERIV_APP_ID is missing in your Replit Secrets!");
  process.exit(1);
}

const BASE_URL = "https://api.derivws.com";

const authHeaders = {
  Authorization: `Bearer ${token}`,
  "Deriv-App-ID": appId,
};

async function main() {
  console.log("🔄 Looking up your Options trading accounts...");

  const accountsRes = await fetch(`${BASE_URL}/trading/v1/options/accounts`, {
    method: "GET",
    headers: authHeaders,
  });

  if (!accountsRes.ok) {
    const body = await accountsRes.text();
    console.log(`❌ Failed to fetch accounts (HTTP ${accountsRes.status}): ${body}`);
    process.exit(1);
  }

  const accountsBody = await accountsRes.json();
  const accounts = accountsBody.data ?? accountsBody;

  if (!Array.isArray(accounts) || accounts.length === 0) {
    console.log("❌ No Options trading accounts found for this token.");
    process.exit(1);
  }

  const demoAccount = accounts.find((a: any) => a.account_type === "demo") ?? accounts[0];
  const accountId = demoAccount.account_id ?? demoAccount.accountId ?? demoAccount.id;

  console.log(`✅ Found account: ${accountId} (${demoAccount.account_type ?? "unknown type"})`);
  console.log("🔄 Requesting an authenticated WebSocket URL (OTP)...");

  const otpRes = await fetch(`${BASE_URL}/trading/v1/options/accounts/${accountId}/otp`, {
    method: "POST",
    headers: authHeaders,
  });

  if (!otpRes.ok) {
    const body = await otpRes.text();
    console.log(`❌ Failed to get OTP (HTTP ${otpRes.status}): ${body}`);
    process.exit(1);
  }

  const otpBody = await otpRes.json();
  const wsUrl = otpBody.data?.url ?? otpBody.url;

  if (!wsUrl) {
    console.log(`❌ OTP response did not include a WebSocket URL: ${JSON.stringify(otpBody)}`);
    process.exit(1);
  }

  console.log("🔄 Connecting to Deriv Options trading WebSocket...");

  const ws = new WebSocket(wsUrl);

  ws.on("open", () => {
    console.log("🎉 SUCCESS! Connected and authenticated with Deriv's new Options trading API!");
    ws.close();
  });

  ws.on("message", (data: any) => {
    console.log("📩 Message:", data.toString());
  });

  ws.on("error", (error) => {
    console.log(`❌ WebSocket Error: ${error.message}`);
  });
}

main().catch((err) => {
  console.log(`❌ Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
