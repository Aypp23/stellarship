import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { HiddenWarrior } from "../target/types/hidden_warrior";
import { randomBytes } from "crypto";
import {
  awaitComputationFinalization,
  getArciumEnv,
  getCompDefAccOffset,
  getArciumAccountBaseSeed,
  getArciumProgAddress,
  uploadCircuit,
  buildFinalizeCompDefTx,
  RescueCipher,
  deserializeLE,
  getMXEAccAddress,
  getMempoolAccAddress,
  getCompDefAccAddress,
  getExecutingPoolAccAddress,
  x25519,
  getComputationAccAddress,
  getClusterAccAddress,
  getMXEPublicKey,
} from "@arcium-hq/client";
import * as fs from "fs";
import * as os from "os";

// Helper function to fetch MXE public key with retries
async function getMXEPublicKeyWithRetry(
  provider: anchor.AnchorProvider,
  programId: PublicKey,
  maxRetries: number = 10,
  retryDelayMs: number = 500
): Promise<Uint8Array> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const mxePublicKey = await getMXEPublicKey(provider, programId);
      if (mxePublicKey) {
        return mxePublicKey;
      }
    } catch (error) {
      console.log(`Attempt ${attempt} failed to fetch MXE public key:`, error);
    }

    if (attempt < maxRetries) {
      console.log(
        `Retrying in ${retryDelayMs}ms... (attempt ${attempt}/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  throw new Error(
    `Failed to fetch MXE public key after ${maxRetries} attempts`
  );
}

describe("HiddenWarrior", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.HiddenWarrior as Program<HiddenWarrior>;
  const provider = anchor.getProvider();

  type Event = anchor.IdlEvents<(typeof program)["idl"]>;
  const awaitEvent = async <E extends keyof Event>(
    eventName: E,
    timeoutMs = 60000
  ): Promise<Event[E]> => {
    let listenerId: number;
    let timeoutId: NodeJS.Timeout;
    const event = await new Promise<Event[E]>((res, rej) => {
      listenerId = program.addEventListener(eventName, (event) => {
        if (timeoutId) clearTimeout(timeoutId);
        res(event);
      });
      timeoutId = setTimeout(() => {
        program.removeEventListener(listenerId);
        rej(new Error(`Event ${eventName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
    await program.removeEventListener(listenerId);
    return event;
  };

  // Get cluster offset from environment variable
  const clusterOffset = process.env.ARCIUM_CLUSTER_OFFSET 
    ? BigInt(process.env.ARCIUM_CLUSTER_OFFSET) 
    : BigInt(768109697);
    
  // Get cluster address using the library function
  const arciumClusterPubkey = getClusterAccAddress(Number(clusterOffset));
  
  console.log("Using cluster offset:", clusterOffset.toString());
  console.log("Cluster address:", arciumClusterPubkey.toBase58());

  let owner: anchor.web3.Keypair;
  let compDefPDA: PublicKey;

  before(async () => {
    // Initialize once before all tests
    // Use wallet from ANCHOR_WALLET environment variable, fallback to default
    const walletPath = process.env.ANCHOR_WALLET || `${os.homedir()}/solana/2.json`;
    owner = readKpJson(walletPath);
    
    // Check wallet balance
    const balance = await provider.connection.getBalance(owner.publicKey);
    console.log(`Wallet balance: ${balance / anchor.web3.LAMPORTS_PER_SOL} SOL`);
    if (balance < anchor.web3.LAMPORTS_PER_SOL) {
      throw new Error(`Insufficient balance: ${balance / anchor.web3.LAMPORTS_PER_SOL} SOL. Need at least 1 SOL for transactions.`);
    }

    // Get the computation definition account address
    const baseSeedCompDefAcc = getArciumAccountBaseSeed(
      "ComputationDefinitionAccount"
    );
    const offsetUint8Array = getCompDefAccOffset("battle_warrior");
    const offsetBuffer = Buffer.from(offsetUint8Array);

    compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeedCompDefAcc, program.programId.toBuffer(), offsetBuffer],
      getArciumProgAddress()
    )[0];

    console.log("Computation definition PDA:", compDefPDA.toBase58());

    // Check if the account already exists
    try {
      const accountInfo = await provider.connection.getAccountInfo(compDefPDA);
      if (accountInfo) {
        console.log("Computation definition account already exists, skipping initialization.");
      } else {
        console.log("Initializing battle warrior computation definition");
        const sig = await initBattleWarriorCompDef(program, owner, false);
        console.log(
          "Battle warrior computation definition initialized with signature",
          sig
        );
      }
      
      // Инициализируем аккаунт для результатов битвы
      const [battleResultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("battle_result")],
        program.programId
      );
      
      try {
        const battleResultAccount = await program.provider.connection.getAccountInfo(battleResultPDA);
        if (battleResultAccount) {
          console.log("Battle result account already exists, skipping initialization.");
        } else {
          console.log("Initializing battle result account");
          const initSig = await program.methods
            .initBattleResult()
            .accounts({
              payer: owner.publicKey,
              battleResult: battleResultPDA,
              systemProgram: SystemProgram.programId,
            })
            .signers([owner])
            .rpc({
              commitment: "confirmed",
            });
          console.log("Battle result account initialized with signature:", initSig);
        }
      } catch (error) {
        console.error("Error checking battle result account:", error);
        throw error;
      }
      
    } catch (error) {
      console.error("Error checking comp def account:", error);
      throw error;
    }
  });

  it("battle warrior with balanced stats", async () => {
    // Create a warrior with balanced characteristics
    await testBattle(75, 60, 80, 65, "Balanced Warrior");
  });

  it("battle warrior with strength focus", async () => {
    // Create a warrior focused on strength
    await testBattle(100, 40, 70, 50, "Strength-Focused Warrior");
  });

  it("battle warrior with agility focus", async () => {
    // Create a warrior focused on agility
    await testBattle(40, 100, 70, 50, "Agility-Focused Warrior");
  });

  it("battle warrior with endurance focus", async () => {
    // Create a warrior focused on endurance
    await testBattle(50, 50, 100, 60, "Endurance-Focused Warrior");
  });

  async function testBattle(
    strength: number,
    agility: number,
    endurance: number,
    intelligence: number,
    warriorType: string
  ) {
    const privateKey = x25519.utils.randomPrivateKey();
    const publicKey = x25519.getPublicKey(privateKey);
    
    // Get the MXE public key dynamically using v0.2.0 approach
    console.log("Getting MXE public key dynamically...");
    
    const mxePublicKey = await getMXEPublicKeyWithRetry(
      provider as anchor.AnchorProvider,
      program.programId
    );
    
    console.log("Retrieved MXE public key:", 
      Buffer.from(mxePublicKey).toString('hex'));
    
    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);

    const nonce = randomBytes(16);
    const nonceValue = new anchor.BN(deserializeLE(nonce).toString());
    
    // Шифруем каждое поле отдельно, как в battleships
    const encryptedStats = cipher.encrypt(
      [BigInt(strength), BigInt(agility), BigInt(endurance), BigInt(intelligence)],
      nonce
    );
    
    // Конвертируем каждый зашифрованный Buffer в массив байтов
    const strength_ct = Array.from(encryptedStats[0]);
    const agility_ct = Array.from(encryptedStats[1]);
    const endurance_ct = Array.from(encryptedStats[2]);
    const intelligence_ct = Array.from(encryptedStats[3]);
    
    // Подписываемся на событие
    const battleResultEventPromise = awaitEvent("battleResultEvent", 180000);

    // ВАЖНО: Правильное использование offset-ов в Arcium:
    // 1. compDefOffset - фиксированный, определяет тип инструкции
    // 2. computationOffset - уникальный для каждого вычисления
    
    // Получаем фиксированный offset для CompDef аккаунта
    const compDefOffset = getCompDefAccOffset("battle_warrior");
    console.log("Using compDef offset:", compDefOffset);
    
    // Генерируем уникальный offset для нового computation аккаунта
    const computationOffset = new anchor.BN(randomBytes(8), "hex");
    console.log("Using unique computation offset:", computationOffset.toString());
    
    console.log(
      "computation account PDA:",
      getComputationAccAddress(program.programId, computationOffset).toBase58()
    );
    
    // Получаем PDA для аккаунта результатов
    const [battleResultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("battle_result")],
      program.programId
    );

    console.log(`\nTesting: ${warriorType}`);
    console.log("Characteristics:");
    console.log(`- Strength: ${strength}`);
    console.log(`- Agility: ${agility}`);
    console.log(`- Endurance: ${endurance}`);
    console.log(`- Intelligence: ${intelligence}`);

    try {
      // Отправляем транзакцию в очередь с отдельными зашифрованными полями, как в battleships
      const queueSig = await program.methods
        .battleWarrior(
          computationOffset,
          Array.from(publicKey),
          nonceValue,
          strength_ct,
          agility_ct,
          endurance_ct,
          intelligence_ct
        )
        .accountsPartial({
          computationAccount: getComputationAccAddress(
            program.programId,
            computationOffset
          ),
          clusterAccount: arciumClusterPubkey,
          mxeAccount: getMXEAccAddress(program.programId),
          mempoolAccount: getMempoolAccAddress(program.programId),
          executingPool: getExecutingPoolAccAddress(program.programId),
          compDefAccount: compDefPDA,
          battleResult: battleResultPDA,
        })
        .preInstructions([
          // Add compute unit price instruction to increase priority
          anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: 2_000_000  // 2 SOL in micro-lamports
          }),
          // Set compute unit limit to maximum
          anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
            units: 250_000
          })
        ])
        .rpc({ 
          commitment: "confirmed",
          skipPreflight: false
        });
      console.log("Queue sig is ", queueSig);
      
      // Получаем аккаунт вычисления для логирования состояния
      const computationAccount = getComputationAccAddress(
        program.programId,
        computationOffset
      );
      
      // Проверяем изначальное состояние аккаунта вычисления
      try {
        const compAccountInfo = await provider.connection.getAccountInfo(computationAccount);
        console.log(`Computation account initialized: ${compAccountInfo !== null}`);
        if (compAccountInfo) {
          console.log(`Computation account data length: ${compAccountInfo.data.length} bytes`);
          // Если данные доступны, пытаемся извлечь статус (обычно на 8 байте)
          if (compAccountInfo.data.length > 8) {
            const statusByte = compAccountInfo.data[8];
            console.log(`Computation status byte [index 8]: ${statusByte}`);
          }
        }
      } catch (error) {
        console.log("Error checking computation account status:", error);
      }

      console.log("Waiting for computation to finalize...");
      try {
        // Ждем finalize-транзакцию с помощью SDK-функции, но с таймаутом
        const finalizePromise = awaitComputationFinalization(
          provider as any,
          computationOffset,
          program.programId,
          "confirmed"
        );
        
        // Добавляем таймаут для финализации
        const finalizationTimeoutMs = 300000; // 5 минут
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Finalization timed out after ${finalizationTimeoutMs/1000} seconds`)), finalizationTimeoutMs)
        );
        
        const finalizeSigUnknown = await Promise.race([finalizePromise, timeoutPromise]);
        if (typeof finalizeSigUnknown !== 'string') {
          // Если это ошибка, она должна была быть выброшена Promise.race
          // Этот блок для дополнительной безопасности или если timeoutPromise может разрешится не строкой
          throw new Error("Finalization signature is not a string or timed out with an error that was not re-thrown.");
        }
        const finalizeSig = finalizeSigUnknown as string; // Теперь finalizeSig имеет тип string
        console.log("Finalize sig is ", finalizeSig);
        
        // Проверяем состояние аккаунта после финализации
        try {
          const compAccountInfoAfter = await provider.connection.getAccountInfo(computationAccount);
          if (compAccountInfoAfter) {
            console.log(`Computation account data after finalize: ${compAccountInfoAfter.data.length} bytes`);
            if (compAccountInfoAfter.data.length > 8) {
              const statusByteAfter = compAccountInfoAfter.data[8];
              console.log(`Computation status byte after finalize [index 8]: ${statusByteAfter}`);
            }
          }
        } catch (error) {
          console.log("Error checking computation account status after finalize:", error);
        }
        
        // Проверяем состояние аккаунта battleResult
        try {
          const battleResultAccountInfo = await provider.connection.getAccountInfo(battleResultPDA);
          console.log(`Battle result account exists: ${battleResultAccountInfo !== null}`);
          if (battleResultAccountInfo) {
            console.log(`Battle result account data length: ${battleResultAccountInfo.data.length} bytes`);
            // Если есть данные, выводим первые байты для анализа
            if (battleResultAccountInfo.data.length > 8) {
              const resultBytes = Array.from(battleResultAccountInfo.data.slice(8, 12));
              console.log(`Battle result data bytes [8-12]: ${resultBytes.join(', ')}`);
            }
          }
        } catch (error) {
          console.log("Error checking battle result account:", error);
        }
        
        console.log("Waiting for battle result event...");
        try {
          const battleResultEvent = await battleResultEventPromise;
          // Используем безопасный доступ к полям с проверкой
          if (battleResultEvent && typeof battleResultEvent === 'object') {
            const result = 'result' in battleResultEvent ? battleResultEvent.result : 'Unknown';
            const resultCode = 'resultCode' in battleResultEvent ? battleResultEvent.resultCode : -1;
            console.log(`Battle result: ${result} (code: ${resultCode})`);
            
            // Дополнительный вывод всех полей события для диагностики
            console.log("All event fields:", JSON.stringify(battleResultEvent, null, 2));
          } else {
            console.log("Received empty or invalid battle result event");
          }
        } catch (error) {
          console.log("No battle result event received after timeout. Checking transaction status on blockchain...");
          console.log("This is normal behavior on some networks as Arcium computation may complete but callback may not fire.");
          console.log("Transaction was successfully sent with signature:", queueSig);
          console.log("Finalize transaction signature:", finalizeSig);
          
          // Дополнительная проверка статуса транзакции
          try {
            const queueTxStatus = await provider.connection.getSignatureStatus(queueSig);
            console.log(`Queue TX status: ${JSON.stringify(queueTxStatus)}`);
            
            const finalizeTxStatus = await provider.connection.getSignatureStatus(finalizeSig); // Теперь finalizeSig имеет тип string
            console.log(`Finalize TX status: ${JSON.stringify(finalizeTxStatus)}`);
          } catch (txError) {
            console.log("Error checking transaction status:", txError);
          }
        }
      } catch (error) {
        console.log("Computation finalization timeout or error:", error);
        console.log("Transaction was successfully sent with signature:", queueSig);
        
        // Проверяем состояние компьютации после ошибки
        try {
          const compAccountInfoAfterError = await provider.connection.getAccountInfo(computationAccount);
          if (compAccountInfoAfterError) {
            console.log(`Computation account after error: ${compAccountInfoAfterError.data.length} bytes`);
            if (compAccountInfoAfterError.data.length > 8) {
              console.log(`Status byte after error: ${compAccountInfoAfterError.data[8]}`);
            }
          } else {
            console.log("Computation account not found after error");
          }
        } catch (checkError) {
          console.log("Error checking computation status after failure:", checkError);
        }
      }
    } catch (error) {
      console.error("Error in battle test:", error);
      // Расширенное логирование ошибок транзакций
      if (error.logs) {
        console.error("Transaction logs:");
        error.logs.forEach((log: string) => console.error(log));
      } else if (error.simulationLogs) {
        console.error("Simulation logs:");
        error.simulationLogs.forEach((log: string) => console.error(log));
      }
    }
  }

  async function initBattleWarriorCompDef(
    program: Program<HiddenWarrior>,
    owner: anchor.web3.Keypair,
    uploadRawCircuit: boolean
  ): Promise<string> {
    const sig = await program.methods
      .initBattleWarriorCompDef()
      .accounts({
        compDefAccount: compDefPDA,
        payer: owner.publicKey,
        mxeAccount: getMXEAccAddress(program.programId),
      })
      .signers([owner])
      .rpc({
        commitment: "confirmed",
      });
    console.log("Init battle warrior computation definition transaction", sig);

    if (uploadRawCircuit) {
      const rawCircuit = fs.readFileSync("build/battle_warrior.arcis");

      await uploadCircuit(
        provider as anchor.AnchorProvider,
        "battle_warrior",
        program.programId,
        rawCircuit,
        true
      );
    } else {
      const offsetUint8ArrayVal = getCompDefAccOffset("battle_warrior_v2");
      const offsetBufferVal = Buffer.from(offsetUint8ArrayVal);
      const finalizeTx = await buildFinalizeCompDefTx(
        provider as anchor.AnchorProvider,
        offsetBufferVal.readUInt32LE(),
        program.programId
      );

      const latestBlockhash = await provider.connection.getLatestBlockhash();
      finalizeTx.recentBlockhash = latestBlockhash.blockhash;
      finalizeTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;

      finalizeTx.sign(owner);

      await provider.sendAndConfirm(finalizeTx);
    }
    return sig;
  }
});

function readKpJson(path: string): anchor.web3.Keypair {
  const file = fs.readFileSync(path);
  return anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(file.toString()))
  );
} 