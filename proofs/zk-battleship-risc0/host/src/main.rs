use std::{fs, path::PathBuf};

use anyhow::{anyhow, Context, Result};
use clap::Parser;
use risc0_zkvm::{default_prover, ExecutorEnv, Prover, ProverOpts};
use risc0_zkvm::sha::Digest;
use serde::{Deserialize, Serialize};
use sha2::{Digest as _, Sha256};

use zkbs_methods::{ZKBS_SETTLE_ELF, ZKBS_SETTLE_ID};
use zkbs_shared::{ProverInput, JOURNAL_LEN, MODE_CLASSIC, MODE_SALVO};

const DEFAULT_GROTH16_SELECTOR: [u8; 4] = [0x73, 0xc4, 0x57, 0xba];

#[derive(Parser)]
struct Args {
    /// Input JSON file (see README.md for schema)
    #[arg(long)]
    input: PathBuf,

    /// Optional output JSON file
    #[arg(long)]
    out: Option<PathBuf>,
}

#[derive(Deserialize)]
struct InputJson {
    session_id: u32,
    mode_id: u32,
    p1_salt_hex: String,
    p1_board_bits_hex: String,
    p2_salt_hex: String,
    p2_board_bits_hex: String,
    transcript_hex: String,
}

#[derive(Serialize)]
struct OutputJson {
    image_id_hex: String,
    journal_hex: String,
    journal_sha256_hex: String,
    seal_hex: String,
}

fn clean_hex(s: &str) -> String {
    s.trim()
        .strip_prefix("0x")
        .unwrap_or(s.trim())
        .chars()
        .filter(|c| c.is_ascii_hexdigit())
        .collect::<String>()
        .to_lowercase()
}

fn hex_to_bytes(s: &str) -> Result<Vec<u8>> {
    let clean = clean_hex(s);
    if clean.is_empty() {
        return Ok(Vec::new());
    }
    if clean.len() % 2 != 0 {
        return Err(anyhow!("invalid hex length"));
    }
    Ok(hex::decode(clean).context("hex decode failed")?)
}

fn hex_to_fixed<const N: usize>(s: &str) -> Result<[u8; N]> {
    let v = hex_to_bytes(s)?;
    if v.len() != N {
        return Err(anyhow!("expected {N} bytes, got {}", v.len()));
    }
    let mut out = [0u8; N];
    out.copy_from_slice(&v);
    Ok(out)
}

fn groth16_selector() -> Result<[u8; 4]> {
    let env = std::env::var("ZKBS_GROTH16_SELECTOR_HEX").unwrap_or_default();
    let clean = clean_hex(&env);
    if clean.is_empty() {
        return Ok(DEFAULT_GROTH16_SELECTOR);
    }
    if clean.len() != 8 {
        return Err(anyhow!(
            "ZKBS_GROTH16_SELECTOR_HEX must be 4 bytes (8 hex chars), got {}",
            clean.len()
        ));
    }
    let raw = hex::decode(clean).context("invalid ZKBS_GROTH16_SELECTOR_HEX")?;
    let mut out = [0u8; 4];
    out.copy_from_slice(&raw);
    Ok(out)
}

fn sha256_hex(bytes: &[u8]) -> String {
    let mut h = Sha256::new();
    h.update(bytes);
    hex::encode(h.finalize())
}

fn main() -> Result<()> {
    let args = Args::parse();
    let raw = fs::read_to_string(&args.input).context("read input json")?;
    let input_json: InputJson = serde_json::from_str(&raw).context("parse input json")?;

    let transcript = hex_to_bytes(&input_json.transcript_hex).context("transcript_hex")?;

    let input = ProverInput {
        session_id: input_json.session_id,
        mode_id: input_json.mode_id,
        p1_salt: hex_to_fixed::<32>(&input_json.p1_salt_hex).context("p1_salt_hex")?,
        p1_board_bits: hex_to_fixed::<8>(&input_json.p1_board_bits_hex).context("p1_board_bits_hex")?,
        p2_salt: hex_to_fixed::<32>(&input_json.p2_salt_hex).context("p2_salt_hex")?,
        p2_board_bits: hex_to_fixed::<8>(&input_json.p2_board_bits_hex).context("p2_board_bits_hex")?,
        transcript,
    };

    // Mirror the guest's basic transcript length check so failures are clearer.
    let shots_per_turn = match input.mode_id {
        MODE_CLASSIC => 1usize,
        MODE_SALVO => 2usize,
        _ => return Err(anyhow!("invalid mode_id (expected 0=classic or 1=salvo)")),
    };
    let stride = shots_per_turn * 3;
    if input.transcript.len() % stride != 0 {
        return Err(anyhow!(
            "invalid transcript length: {} (expected multiple of {})",
            input.transcript.len(),
            stride
        ));
    }

    let env = ExecutorEnv::builder()
        .write(&input)
        .context("write prover input")?
        .build()
        .context("build executor env")?;

    let opts = ProverOpts::groth16();
    let info = default_prover()
        .prove_with_opts(env, ZKBS_SETTLE_ELF, &opts)
        .context("prove_with_opts")?;

    let receipt = info.receipt;
    let groth16_seal = receipt
        .inner
        .groth16()
        .map_err(|_| anyhow!("expected Groth16 receipt (check ProverOpts::groth16())"))?
        .seal
        .clone();
    if groth16_seal.len() != 256 {
        return Err(anyhow!(
            "unexpected Groth16 seal length: {} (expected 256)",
            groth16_seal.len()
        ));
    }

    let journal = receipt.journal.bytes.clone();
    if journal.len() != JOURNAL_LEN {
        return Err(anyhow!(
            "unexpected journal length: {} (expected {})",
            journal.len(),
            JOURNAL_LEN
        ));
    }

    // Soroban verifier router expects selector-prefixed seal.
    let selector = groth16_selector()?;
    let mut seal = Vec::with_capacity(4 + groth16_seal.len());
    seal.extend_from_slice(&selector);
    seal.extend_from_slice(&groth16_seal);

    let out = OutputJson {
        image_id_hex: hex::encode(Digest::new(ZKBS_SETTLE_ID).as_bytes()),
        journal_hex: hex::encode(&journal),
        journal_sha256_hex: sha256_hex(&journal),
        seal_hex: hex::encode(&seal),
    };

    let out_text = serde_json::to_string_pretty(&out).context("serialize output json")?;
    if let Some(path) = &args.out {
        fs::write(path, &out_text).context("write output")?;
    }

    println!("{out_text}");
    Ok(())
}
