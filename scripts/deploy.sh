#!/usr/bin/env bash
# Deploy SHAKE to Stellar testnet from scratch (safe to re-run after a testnet reset).
#   1. funds three accounts with Friendbot: issuer (mints tEUR), sponsor (pays reserves), team (pitch seller)
#   2. issues tEUR and deploys its Stellar Asset Contract
#   3. builds and deploys the deal contract
#   4. writes every id and key to .env.local (git-ignored)
set -euo pipefail
cd "$(dirname "$0")/.."

STELLAR="${STELLAR:-stellar}"
command -v "$STELLAR" >/dev/null 2>&1 || STELLAR="/c/Program Files (x86)/Stellar CLI/stellar.exe"
NET=(--network testnet)
# CONTRACT_ONLY=1 redeploys just the deal contract, keeping tEUR and the accounts in .env.local
if [ "${CONTRACT_ONLY:-}" = "1" ]; then
  SPONSOR_SECRET=$(grep '^SPONSOR_SECRET=' .env.local | cut -d= -f2)
  ( cd contracts/escrow && "$STELLAR" contract build >/dev/null )
  DEAL_ID=$("$STELLAR" contract deploy --wasm contracts/escrow/target/wasm32v1-none/release/shake_deal.wasm --source "$SPONSOR_SECRET" "${NET[@]}")
  sed -i "s/^NEXT_PUBLIC_DEAL_CONTRACT_ID=.*/NEXT_PUBLIC_DEAL_CONTRACT_ID=$DEAL_ID/" .env.local
  echo "deal contract $DEAL_ID"
  exit 0
fi
SUFFIX="${SUFFIX:-$(date +%s)}"   # fresh identities per deploy, so a re-run never collides
ISSUER="shake-issuer-$SUFFIX"; SPONSOR="shake-sponsor-$SUFFIX"; TEAM="shake-team-$SUFFIX"

for k in "$ISSUER" "$SPONSOR" "$TEAM"; do
  "$STELLAR" keys generate "$k" "${NET[@]}" --fund >/dev/null
done
ISSUER_PK=$("$STELLAR" keys address "$ISSUER")
ASSET="tEUR:$ISSUER_PK"
echo "issuer $ISSUER_PK"

# team account must trust tEUR to receive released money
"$STELLAR" tx new change-trust --source "$TEAM" --line "$ASSET" "${NET[@]}" >/dev/null
TOKEN_ID=$("$STELLAR" contract asset deploy --asset "$ASSET" --source "$ISSUER" "${NET[@]}" 2>/dev/null || "$STELLAR" contract id asset --asset "$ASSET" "${NET[@]}")
echo "tEUR SAC $TOKEN_ID"

( cd contracts/escrow && "$STELLAR" contract build >/dev/null )
DEAL_ID=$("$STELLAR" contract deploy --wasm contracts/escrow/target/wasm32v1-none/release/shake_deal.wasm --source "$SPONSOR" "${NET[@]}")
echo "deal contract $DEAL_ID"

touch .env.local
# drop previous deploy values, keep everything else (e.g. CHANNELS_API_KEY)
grep -vE '^(NEXT_PUBLIC_(DEAL_CONTRACT_ID|TOKEN_CONTRACT_ID|TOKEN_ISSUER|TEAM_ADDRESS|NETWORK)|ISSUER_SECRET|SPONSOR_SECRET|TEAM_SECRET)=' .env.local > .env.local.tmp || true
cat >> .env.local.tmp <<EOF
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_DEAL_CONTRACT_ID=$DEAL_ID
NEXT_PUBLIC_TOKEN_CONTRACT_ID=$TOKEN_ID
NEXT_PUBLIC_TOKEN_ISSUER=$ISSUER_PK
NEXT_PUBLIC_TEAM_ADDRESS=$("$STELLAR" keys address "$TEAM")
ISSUER_SECRET=$("$STELLAR" keys show "$ISSUER")
SPONSOR_SECRET=$("$STELLAR" keys show "$SPONSOR")
TEAM_SECRET=$("$STELLAR" keys show "$TEAM")
EOF
mv .env.local.tmp .env.local
echo "wrote .env.local"
echo "https://stellar.expert/explorer/testnet/contract/$DEAL_ID"
