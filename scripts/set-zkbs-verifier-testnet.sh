#!/usr/bin/env bash
set -euo pipefail

NETWORK="${NETWORK:-testnet}"
IDENTITY="${IDENTITY:-zkbs-deployer}"

ZKBS_CONTRACT_ID="${ZKBS_CONTRACT_ID:-${1:-}}"
VERIFIER_ROUTER_ID="${VERIFIER_ROUTER_ID:-${2:-}}"
IMAGE_ID_HEX="${IMAGE_ID_HEX:-${3:-}}"

if [[ -z "${ZKBS_CONTRACT_ID}" || -z "${VERIFIER_ROUTER_ID}" || -z "${IMAGE_ID_HEX}" ]]; then
  cat <<'EOF'
Usage:
  ZKBS_CONTRACT_ID=<C...> VERIFIER_ROUTER_ID=<C...> IMAGE_ID_HEX=<64-hex> ./scripts/set-zkbs-verifier-testnet.sh

Or:
  ./scripts/set-zkbs-verifier-testnet.sh <ZKBS_CONTRACT_ID> <VERIFIER_ROUTER_ID> <IMAGE_ID_HEX>

Defaults:
  NETWORK=testnet
  IDENTITY=zkbs-deployer
EOF
  exit 1
fi

IMAGE_ID_HEX_CLEAN="$(echo "${IMAGE_ID_HEX}" | tr -d '[:space:]' | sed -E 's/^0x//')"
if [[ "${#IMAGE_ID_HEX_CLEAN}" -ne 64 ]]; then
  echo "IMAGE_ID_HEX must be 32 bytes (64 hex chars). Got length ${#IMAGE_ID_HEX_CLEAN}." >&2
  exit 1
fi

stellar contract invoke \
  --network "${NETWORK}" \
  --source "${IDENTITY}" \
  --id "${ZKBS_CONTRACT_ID}" \
  -- \
  set_verifier \
  --verifier_router "${VERIFIER_ROUTER_ID}" \
  --image_id "${IMAGE_ID_HEX_CLEAN}"

