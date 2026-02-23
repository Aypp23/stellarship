import * as anchor from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import {
    x25519,
    RescueCipher,
    deserializeLE,
    getMXEAccAddress,
    getMempoolAccAddress,
    getExecutingPoolAccAddress,
    getComputationAccAddress,
    getArciumProgAddress,
    getClusterAccAddress,
    getMXEPublicKey,
    getArciumAccountBaseSeed,
    getCompDefAccOffset,
} from '@arcium-hq/client';
import { Warrior } from '@/types/game';

// Адреса из IDL
const POOL_ACCOUNT_PUBKEY = new PublicKey('FsWbPQcJQ2cCyr9ndse13fDqds4F2Ezx2WgTL25Dke4M');
const CLOCK_ACCOUNT_PUBKEY = new PublicKey('AxygBawEvVwZPetj3yPJb9sGdZvaJYsVguET1zFUQkV');
const ARCIUM_PROGRAM_ID = new PublicKey('BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6');

// Cluster offset - должен совпадать с тестами!
// В тестах используется: process.env.ARCIUM_CLUSTER_OFFSET || 768109697
const CLUSTER_OFFSET = 768109697;

// Helper function to check if MXE account exists and get its info
async function checkMXEAccountInfo(
    provider: anchor.AnchorProvider,
    programId: PublicKey
): Promise<{ exists: boolean; accountInfo: any }> {
    try {
        const mxeAccountAddress = getMXEAccAddress(programId);
        const accountInfo = await provider.connection.getAccountInfo(mxeAccountAddress);
        
        if (accountInfo) {
            console.log("✅ MXE Account exists!");
            console.log("  Address:", mxeAccountAddress.toString());
            console.log("  Owner:", accountInfo.owner.toString());
            console.log("  Data length:", accountInfo.data.length, "bytes");
            console.log("  Lamports:", accountInfo.lamports);
            console.log("  Executable:", accountInfo.executable);
            return { exists: true, accountInfo };
        } else {
            console.log("❌ MXE Account does NOT exist!");
            console.log("  Expected address:", mxeAccountAddress.toString());
            return { exists: false, accountInfo: null };
        }
    } catch (error) {
        console.error("Error checking MXE account:", error);
        return { exists: false, accountInfo: null };
    }
}

// Helper function to get MXE public key ДИНАМИЧЕСКИ
export async function getMXEPublicKeyWithRetry(
    provider: anchor.AnchorProvider,
    programId: PublicKey,
    maxRetries: number = 10,
    retryDelayMs: number = 500
): Promise<Uint8Array> {
    console.log("\n🔐 ===== FETCHING MXE PUBLIC KEY =====");
    console.log("Program ID:", programId.toString());
    const mxeAccountAddress = getMXEAccAddress(programId);
    console.log("MXE Account Address:", mxeAccountAddress.toString());
    console.log("Provider connection RPC:", provider.connection.rpcEndpoint);
    
    // Проверяем существование аккаунта перед попытками
    const accountCheck = await checkMXEAccountInfo(provider, programId);
    if (!accountCheck.exists) {
        const errorMsg = `MXE account does not exist at address ${mxeAccountAddress.toString()} for program ID ${programId.toString()}. ` +
            `Please ensure the MXE account is initialized for the new program ID.`;
        console.error("\n❌ ===== MXE ACCOUNT DOES NOT EXIST =====");
        console.error(errorMsg);
        throw new Error(errorMsg);
    }
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`\n[Attempt ${attempt}/${maxRetries}] Calling getMXEPublicKey...`);
            const mxePublicKey = await getMXEPublicKey(provider, programId);
            console.log("Returned value:", mxePublicKey);
            console.log("Type:", typeof mxePublicKey);
            console.log("Is Uint8Array?", mxePublicKey instanceof Uint8Array);
            
            if (mxePublicKey) {
                console.log("Length:", mxePublicKey.length);
                console.log("✅ Successfully fetched MXE public key:", Buffer.from(mxePublicKey).toString('hex'));
                return mxePublicKey;
            } else {
                console.log("⚠️ getMXEPublicKey returned null/undefined");
            }
        } catch (error) {
            console.error(`❌ Attempt ${attempt} failed with error:`);
            console.error("Error type:", error?.constructor?.name);
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error("Error message:", errorMessage);
            console.error("Full error:", error);
            
            // Если ошибка связана с несуществующим аккаунтом, выбрасываем сразу
            if (errorMessage.includes("does not exist") || errorMessage.includes("Account does not exist")) {
                // Извлекаем адрес из сообщения об ошибке, если он есть
                const addressMatch = errorMessage.match(/([1-9A-HJ-NP-Za-km-z]{32,44})/);
                const errorAddress = addressMatch ? addressMatch[1] : 'unknown';
                
                console.error("\n❌ ===== ACCOUNT ERROR DETAILS =====");
                console.error("Expected MXE Account:", mxeAccountAddress.toString());
                console.error("Error Address:", errorAddress);
                console.error("Program ID:", programId.toString());
                console.error("=====================================\n");
                
                const errorMsg = `Account error: The account at address ${errorAddress} does not exist or has no data. ` +
                    `Expected MXE account address: ${mxeAccountAddress.toString()}. ` +
                    `Please verify that all required accounts (MXE, comp_def, etc.) are properly initialized for program ID ${programId.toString()}. ` +
                    `Note: After changing program ID, all derived accounts (MXE, comp_def, etc.) need to be re-initialized.`;
                throw new Error(errorMsg);
            }
        }

        if (attempt < maxRetries) {
            console.log(`⏳ Retrying in ${retryDelayMs}ms...`);
            await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
    }
    
    console.error("\n❌ ===== FAILED TO FETCH MXE PUBLIC KEY =====\n");
    throw new Error(`Failed to fetch MXE public key after ${maxRetries} attempts`);
}

export async function prepareBattleWarriorArgs(
    provider: anchor.AnchorProvider,
    programId: PublicKey,
    warrior: Warrior,
    payerPubkey: PublicKey
) {
    
    // 1. Get MXE public key dynamically
    const mxePublicKey = await getMXEPublicKeyWithRetry(provider, programId);

    // 2. Генерация ключей для шифрования
    const clientPrivateKey = x25519.utils.randomPrivateKey();
    const clientPublicKey = x25519.getPublicKey(clientPrivateKey);

    // 3. Вычисление общего секрета
    const sharedSecret = x25519.getSharedSecret(clientPrivateKey, mxePublicKey);

    // 4. Создание шифра
    const cipher = new RescueCipher(sharedSecret);

    // 5. Генерация nonce
    const nonceBytes = new Uint8Array(16);
    crypto.getRandomValues(nonceBytes);
    const nonceBN = new anchor.BN(deserializeLE(nonceBytes).toString());

    // 6. Шифруем каждую характеристику ОТДЕЛЬНО (как в тестах!)
    const encryptedStats = cipher.encrypt(
        [BigInt(warrior.strength), BigInt(warrior.agility), BigInt(warrior.endurance), BigInt(warrior.intelligence)],
        nonceBytes
    );
    
    // Конвертируем каждый зашифрованный Buffer в массив байтов
    const strengthCt = Array.from(encryptedStats[0]);
    const agilityCt = Array.from(encryptedStats[1]);
    const enduranceCt = Array.from(encryptedStats[2]);
    const intelligenceCt = Array.from(encryptedStats[3]);

    // 7. Генерация computation_offset
    const computationOffsetBytes = new Uint8Array(8);
    crypto.getRandomValues(computationOffsetBytes);
    const computationOffset = new anchor.BN(deserializeLE(computationOffsetBytes).toString());

    // 8. Подготовка публичных ключей для аккаунтов
    const actualArciumProgramId = getArciumProgAddress();
    const mxeAccount = getMXEAccAddress(programId);
    const mempoolAccount = getMempoolAccAddress(programId);
    
    // ✅ ПРАВИЛЬНОЕ вычисление comp_def account как в тестах
    const baseSeedCompDefAcc = getArciumAccountBaseSeed("ComputationDefinitionAccount");
    const offsetUint8Array = getCompDefAccOffset("battle_warrior");
    const offsetBuffer = Buffer.from(offsetUint8Array);
    const arciumProgramId = getArciumProgAddress();
    
    const [compDefAccount] = PublicKey.findProgramAddressSync(
        [baseSeedCompDefAcc, programId.toBuffer(), offsetBuffer],
        arciumProgramId
    );
    console.log("✅ Using comp_def account:", compDefAccount.toString());
    console.log("  -> Base seed:", baseSeedCompDefAcc.toString('hex'));
    console.log("  -> Offset:", offsetBuffer.toString('hex'));
    
    const executingPool = getExecutingPoolAccAddress(programId);
    const computationAccount = getComputationAccAddress(programId, computationOffset);
    
    // Получаем cluster account используя функцию из @arcium-hq/client
    const clusterAccount = getClusterAccAddress(CLUSTER_OFFSET);
    
    const [battleResultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("battle_result")],
        programId
    );
    
    const [signPdaAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("SignerAccount")],
        programId
    );

    // Log all accounts for debugging
    console.log("\n=== DETAILED BATTLE ACCOUNTS DEBUG ===");
    console.log("Program ID:", programId.toString());
    console.log("Payer:", payerPubkey.toString());
    console.log("Sign PDA Account:", signPdaAccount.toString());
    console.log("MXE Account:", mxeAccount.toString());
    console.log("Mempool Account:", mempoolAccount.toString());
    console.log("Executing Pool:", executingPool.toString());
    console.log("Computation Account:", computationAccount.toString());
    console.log("  -> Computation Offset:", computationOffset.toString());
    console.log("Comp Def Account:", compDefAccount.toString());
    console.log("Cluster Account:", clusterAccount.toString());
    console.log("  -> Cluster Offset:", CLUSTER_OFFSET);
    console.log("Pool Account:", POOL_ACCOUNT_PUBKEY.toString());
    console.log("Clock Account:", CLOCK_ACCOUNT_PUBKEY.toString());
    console.log("Battle Result PDA:", battleResultPDA.toString());
    console.log("System Program:", SystemProgram.programId.toString());
    console.log("Arcium Program:", actualArciumProgramId.toString());
    console.log("\n=== ENCRYPTED DATA ===");
    console.log("Encryption Public Key:", Buffer.from(Array.from(clientPublicKey)).toString('hex'));
    console.log("Nonce:", nonceBN.toString());
    console.log("Strength CT length:", strengthCt.length);
    console.log("Agility CT length:", agilityCt.length);
    console.log("Endurance CT length:", enduranceCt.length);
    console.log("Intelligence CT length:", intelligenceCt.length);
    console.log("========================\n");

    return {
        args: {
            computationOffset,
            encryptionPubkey: Array.from(clientPublicKey),
            nonce: nonceBN,
            strengthCt,
            agilityCt,
            enduranceCt,
            intelligenceCt,
        },
        accounts: {
            payer: payerPubkey,
            signPdaAccount,
            mxeAccount,
            mempoolAccount,
            executingPool,
            computationAccount,
            compDefAccount,
            clusterAccount,
            poolAccount: POOL_ACCOUNT_PUBKEY,
            clockAccount: CLOCK_ACCOUNT_PUBKEY,
            battleResult: battleResultPDA,
            systemProgram: SystemProgram.programId,
            arciumProgram: actualArciumProgramId,
        },
    };
}

// Функция для создания и отправки транзакции для боя (БЕЗ использования Anchor Program API)
export async function sendBattleTransaction(
    provider: anchor.AnchorProvider,
    programId: PublicKey,
    warrior: Warrior
): Promise<string> {
    try {
        /*console.log("\n🎮 ===== STARTING BATTLE TRANSACTION =====");
        console.log("Warrior stats:", {
            strength: warrior.strength,
            agility: warrior.agility,
            endurance: warrior.endurance,
            intelligence: warrior.intelligence
        });
        console.log("Program ID:", programId.toString());
        console.log("Wallet Public Key:", provider.wallet.publicKey.toString());
        */
        // Подготовка аргументов для транзакции
        //console.log("\n📦 Preparing battle arguments...");
        const prepared = await prepareBattleWarriorArgs(
            provider,
            programId,
            warrior,
            provider.wallet.publicKey
        );
        
        //console.log("\n✅ Arguments prepared, building transaction manually...");
        
        // 🔥 Создаем инструкцию ВРУЧНУЮ без использования Anchor Program
        // Дискриминатор для battle_warrior из IDL
        const discriminator = Buffer.from([29, 211, 244, 79, 5, 143, 210, 159]);
        
        // Сериализуем аргументы вручную в правильном порядке из IDL
        const data = Buffer.concat([
            discriminator,
            prepared.args.computationOffset.toArrayLike(Buffer, 'le', 8),
            Buffer.from(prepared.args.encryptionPubkey),
            prepared.args.nonce.toArrayLike(Buffer, 'le', 16),
            Buffer.from(prepared.args.strengthCt),
            Buffer.from(prepared.args.agilityCt),
            Buffer.from(prepared.args.enduranceCt),
            Buffer.from(prepared.args.intelligenceCt)
        ]);
        
        /*console.log("\n📝 Instruction data:");
        console.log("  Total length:", data.length, "bytes");
        console.log("  Discriminator:", discriminator.toString('hex'));
        console.log("  First 50 bytes:", data.slice(0, 50).toString('hex'));
        */
        // Создаем массив ключей аккаунтов в правильном порядке из IDL
        const keys = [
            { pubkey: prepared.accounts.payer, isSigner: true, isWritable: true },
            { pubkey: prepared.accounts.signPdaAccount, isSigner: false, isWritable: true },
            { pubkey: prepared.accounts.mxeAccount, isSigner: false, isWritable: false },
            { pubkey: prepared.accounts.mempoolAccount, isSigner: false, isWritable: true },
            { pubkey: prepared.accounts.executingPool, isSigner: false, isWritable: true },
            { pubkey: prepared.accounts.computationAccount, isSigner: false, isWritable: true },
            { pubkey: prepared.accounts.compDefAccount, isSigner: false, isWritable: false },
            { pubkey: prepared.accounts.clusterAccount, isSigner: false, isWritable: true },
            { pubkey: prepared.accounts.poolAccount, isSigner: false, isWritable: true },
            { pubkey: prepared.accounts.clockAccount, isSigner: false, isWritable: false },
            { pubkey: prepared.accounts.battleResult, isSigner: false, isWritable: true },
            { pubkey: prepared.accounts.systemProgram, isSigner: false, isWritable: false },
            { pubkey: prepared.accounts.arciumProgram, isSigner: false, isWritable: false }
        ];
        
        //console.log("\n🔑 Transaction accounts (in order):");
        keys.forEach((key, index) => {
            console.log(`  [${index}] ${key.pubkey.toString()} (signer: ${key.isSigner}, writable: ${key.isWritable})`);
        });
        
        // Создаем инструкцию
        const battleInstruction = new TransactionInstruction({
            keys,
            programId,
            data
        });
        
        // Создаем транзакцию
        const transaction = new Transaction().add(battleInstruction);
        
        // Добавляем blockhash
        const { blockhash } = await provider.connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = provider.wallet.publicKey;
        
        // Пользователь подписывает транзакцию
        //console.log("\n⏳ Waiting for user to confirm transaction...");
        const signedTransaction = await provider.wallet.signTransaction(transaction);
       //console.log("✅ Transaction signed");
        
        // Отправляем транзакцию
       // console.log("📤 Sending transaction to network...");
        const signature = await provider.connection.sendRawTransaction(signedTransaction.serialize(), {
            skipPreflight: true,
            preflightCommitment: 'processed'
        });
        
        /*console.log("\n🎯 ===== TRANSACTION SENT SUCCESSFULLY =====");
        console.log("Signature:", signature);
        console.log("View on explorer: https://explorer.solana.com/tx/" + signature + "?cluster=devnet");
        console.log("===========================================\n");
        */
        return signature;
    } catch (error) {
        console.error("❌ Failed to send battle transaction:", error);
        
        if (error instanceof Error) {
            throw error;
        }
        
        throw new Error('Failed to send battle transaction: ' + String(error));
    }
}
