#!/usr/bin/env bash
set -euo pipefail

NETWORK="${NETWORK:-testnet}"
IDENTITY="${IDENTITY:-zkbs-deployer}"

ZKBS_CONTRACT_ID="${ZKBS_CONTRACT_ID:-${1:-}}"
VERIFIER_ROUTER_ID="${VERIFIER_ROUTER_ID:-${2:-}}"
GROTH16_VERIFIER_ID="${GROTH16_VERIFIER_ID:-${3:-}}"
IMAGE_ID_HEX="${IMAGE_ID_HEX:-${4:-}}"

if [[ -z "${ZKBS_CONTRACT_ID}" || -z "${VERIFIER_ROUTER_ID}" || -z "${GROTH16_VERIFIER_ID}" || -z "${IMAGE_ID_HEX}" ]]; then
  cat <<'EOF'
Usage:
  ZKBS_CONTRACT_ID=<C...> VERIFIER_ROUTER_ID=<C...> GROTH16_VERIFIER_ID=<C...> IMAGE_ID_HEX=<64-hex> ./scripts/configure-zkbs-risc0-testnet.sh

Or:
  ./scripts/configure-zkbs-risc0-testnet.sh <ZKBS_CONTRACT_ID> <VERIFIER_ROUTER_ID> <GROTH16_VERIFIER_ID> <IMAGE_ID_HEX>

Defaults:
  NETWORK=testnet
  IDENTITY=zkbs-deployer
EOF
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

clean_hex() {
  echo "${1}" | tr -d '[:space:]' | sed -E 's/^0x//' | tr '[:upper:]' '[:lower:]' | sed -E 's/[^0-9a-f]//g'
}

extract_selector_hex() {
  local raw="$1"
  local found
  found="$(echo "${raw}" | grep -Eo '[0-9a-fA-F]{8}' | head -n 1 || true)"
  if [[ -z "${found}" ]]; then
    return 1
  fi
  clean_hex "${found}"
}

IMAGE_ID_HEX_CLEAN="$(clean_hex "${IMAGE_ID_HEX}")"
if [[ "${#IMAGE_ID_HEX_CLEAN}" -ne 64 ]]; then
  echo "IMAGE_ID_HEX must be 32 bytes (64 hex chars). Got length ${#IMAGE_ID_HEX_CLEAN}." >&2
  exit 1
fi

echo "Fetching verifier selector from ${GROTH16_VERIFIER_ID}..."
SELECTOR_RAW="$(
  stellar contract invoke \
    --network "${NETWORK}" \
    --source "${IDENTITY}" \
    --id "${GROTH16_VERIFIER_ID}" \
    -- \
    selector
)"
SELECTOR_HEX="$(extract_selector_hex "${SELECTOR_RAW}" || true)"
if [[ -z "${SELECTOR_HEX}" || "${#SELECTOR_HEX}" -ne 8 ]]; then
  echo "Failed to parse selector from verifier response: ${SELECTOR_RAW}" >&2
  exit 1
fi
echo "Verifier selector: ${SELECTOR_HEX}"

echo "Registering selector in router ${VERIFIER_ROUTER_ID}..."
set +e
ADD_OUT="$(
  stellar contract invoke \
    --network "${NETWORK}" \
    --source "${IDENTITY}" \
    --id "${VERIFIER_ROUTER_ID}" \
    -- \
    add_verifier \
    --selector "${SELECTOR_HEX}" \
    --verifier "${GROTH16_VERIFIER_ID}" 2>&1
)"
ADD_RC=$?
set -e

if [[ ${ADD_RC} -ne 0 ]]; then
  if echo "${ADD_OUT}" | grep -Eq "SelectorInUse|Error\(Contract, #6\)"; then
    echo "Selector already registered. Verifying target verifier..."
  else
    echo "Router add_verifier failed:" >&2
    echo "${ADD_OUT}" >&2
    exit 1
  fi
fi

set +e
ROUTER_VERIFIER_RAW="$(
  stellar contract invoke \
    --network "${NETWORK}" \
    --source "${IDENTITY}" \
    --id "${VERIFIER_ROUTER_ID}" \
    -- \
    get_verifier_by_selector \
    --selector "${SELECTOR_HEX}" 2>&1
)"
ROUTER_VERIFIER_RC=$?
set -e
if [[ ${ROUTER_VERIFIER_RC} -ne 0 ]]; then
  echo "Failed to read router mapping:" >&2
  echo "${ROUTER_VERIFIER_RAW}" >&2
  exit 1
fi

if ! echo "${ROUTER_VERIFIER_RAW}" | grep -q "${GROTH16_VERIFIER_ID}"; then
  echo "Router selector mapping mismatch for ${SELECTOR_HEX}." >&2
  echo "Expected verifier: ${GROTH16_VERIFIER_ID}" >&2
  echo "Actual response: ${ROUTER_VERIFIER_RAW}" >&2
  exit 1
fi
echo "Router mapping verified: ${SELECTOR_HEX} -> ${GROTH16_VERIFIER_ID}"

echo "Configuring zk-battleship verifier router/image_id..."
NETWORK="${NETWORK}" \
IDENTITY="${IDENTITY}" \
"${SCRIPT_DIR}/set-zkbs-verifier-testnet.sh" \
  "${ZKBS_CONTRACT_ID}" \
  "${VERIFIER_ROUTER_ID}" \
  "${IMAGE_ID_HEX_CLEAN}"

cat <<EOF

Done.
Use this selector for prover/relay runtime if needed:
  ZKBS_GROTH16_SELECTOR_HEX=${SELECTOR_HEX}

Recommended env updates:
  apps/relay/.env:
    ZKBS_GROTH16_SELECTOR_HEX=${SELECTOR_HEX}
EOF
