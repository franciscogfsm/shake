#!/usr/bin/env bash
# Issue extra test stablecoins (tUSD, tGBP, tBRL) from the same issuer, wrap each as a Stellar Asset Contract,
# give the team account trustlines, and record the contract ids in .env.local. Safe to re-run.
set -euo pipefail
cd "$(dirname "$0")/.."
STELLAR="${STELLAR:-stellar}"
command -v "$STELLAR" >/dev/null 2>&1 || STELLAR="/c/Program Files (x86)/Stellar CLI/stellar.exe"
val() { grep "^$1=" .env.local | cut -d= -f2; }
ISSUER_PK=$(val NEXT_PUBLIC_TOKEN_ISSUER); ISSUER_SK=$(val ISSUER_SECRET); TEAM_SK=$(val TEAM_SECRET)
for CODE in USD GBP BRL; do
  ASSET="t$CODE:$ISSUER_PK"
  ID=$("$STELLAR" contract asset deploy --asset "$ASSET" --source "$ISSUER_SK" --network testnet 2>/dev/null || "$STELLAR" contract id asset --asset "$ASSET" --network testnet)
  "$STELLAR" tx new change-trust --source "$TEAM_SK" --line "$ASSET" --network testnet >/dev/null 2>&1 || true
  grep -v "^NEXT_PUBLIC_TOKEN_$CODE=" .env.local > .env.local.tmp || true
  echo "NEXT_PUBLIC_TOKEN_$CODE=$ID" >> .env.local.tmp && mv .env.local.tmp .env.local
  echo "t$CODE $ID"
done
grep -q "^NEXT_PUBLIC_TOKEN_EUR=" .env.local || echo "NEXT_PUBLIC_TOKEN_EUR=$(val NEXT_PUBLIC_TOKEN_CONTRACT_ID)" >> .env.local
