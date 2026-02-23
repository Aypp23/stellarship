# Hidden Warrior - Confidential Battle Game on Solana Using Arcium

This project demonstrates the creation of a confidential battle game on the Solana blockchain using Arcium. Players create warriors with a set of hidden characteristics and battle against opponents generated in Arcium's secure computing environment.

## How It Works

### Privacy Problem in Blockchain Games

In conventional blockchain games, all data is public. This means opponents can see each other's characteristics and predict strategies. With Arcium, we can create a game where the player's warrior characteristics remain hidden.

## Gameplay

1. Player initializes a game session on Solana.
2. Player creates a warrior by selecting four characteristics: Strength, Agility, Endurance, Intelligence.
3. These characteristics are encrypted and sent to the Solana program.
4. The Solana program initiates confidential computations in the Arcium network.
5. Within Arcium's secure environment:
   - An opponent with random characteristics is generated
   - A battle between the player's warrior and the opponent is simulated
   - The winner is determined based on characteristics and random factors
6. The battle result (victory, defeat) is returned to the Solana program.
7. The result is recorded on the blockchain.

## Warrior Characteristics

- **Strength**: Affects the base damage in battle
- **Agility**: Affects the chance to dodge opponent attacks
- **Endurance**: Affects the warrior's health
- **Intelligence**: Affects the chance for critical hits

## Getting Started

### Prerequisites
- Solana CLI tools
- Anchor framework
- Arcium SDK

### Installation

1. Clone the repository
```bash
git clone https://github.com/sicmundu/hidden-warrior.git
cd hidden-warrior
```

2. Install dependencies
```bash
yarn install
```

3. Build the program
```bash
arcium build
```

4. Deploy the program to Solana Devnet
```bash
arcium deploy --cluster-offset <YOUR_CLUSTER_OFFSET> --keypair-path <PATH_TO_KEYPAIR>
```

5. Run tests
```bash
export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
export ANCHOR_WALLET=<PATH_TO_KEYPAIR>
export ARCIUM_CLUSTER_OFFSET=<YOUR_CLUSTER_OFFSET>
yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts
```

## Checking Battle Results

Since Arcium computations on Devnet can take a long time to complete (sometimes 10-30 minutes or even longer), the tests don't wait for the final battle results. Instead, you can check the battle results later using the `check-battle-results.ts` utility.

When you run the tests, you'll see the transaction signature in the console output. Copy this signature and use it with the utility:

```bash
# Run the utility directly with ts-node
export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
export ANCHOR_WALLET=<PATH_TO_KEYPAIR>
npx ts-node check-battle-results.ts <TRANSACTION_SIGNATURE>
```

This utility will:
1. Show details about the transaction and its logs
2. Attempt to find any battle result events in the logs
3. Set up a listener for new battle result events (waits for 60 seconds)

If no result is available yet, you can:
1. Run the utility again later when the computation might be complete
2. Check the transaction status in the Solana Explorer (a link is provided in the output)

### Example

```
$ npx ts-node check-battle-results.ts 35XfeTZTBEawDWaT7erfDPyiwBMDBP8dTLB8oFFQND2iMp5Nq1ofipUsYMeDrTUpeZJjMpUo4uy7S6nNtSu8a1Kc

Checking battle results for transaction: 35XfeTZTBEawDWaT7erfDPyiwBMDBP8dTLB8oFFQND2iMp5Nq1ofipUsYMeDrTUpeZJjMpUo4uy7S6nNtSu8a1Kc
This may take some time if the computation is still in progress...

Transaction details:
Status: Success
Block Time: 20.05.2025, 11:44:39
Slot: 382082391

Transaction logs:
1: Program 9j4JGyPqw2kdKkbmrj5JA43wbLiQ5dt56DngquJQLfAv invoke [1]
2: Program log: Instruction: BattleWarrior
...

Setting up a listener for battle result events...
Waiting for 60 seconds for any events to arrive...

Battle Result Event Received!
Result: Player Victory
Result Code: 0
```

## Architecture

The project consists of two main parts:
1. **Solana Program**: Handles the blockchain interactions, account management, and initiates the confidential computations
2. **Arcium Circuit**: Contains the confidential battle logic executed in the Arcium MPC environment

For more information, refer to the [Arcium documentation](https://docs.arcium.com).

## Hidden Warrior

A confidential battle game built on Solana using Arcium's private computation capabilities.

### About

Hidden Warrior is a game where players can engage in battles with confidential warrior statistics. The game uses Arcium for private computations to determine battle outcomes without revealing the players' warrior characteristics.

### Gameplay

1. Players initialize their warriors with confidential statistics.
2. Players can engage in battles with other warriors.
3. Battle outcomes are determined through confidential computation in Arcium.
4. Results are published on-chain without revealing the actual warrior statistics.

### Technical Features

- **Confidential Warrior Stats**: Player statistics are encrypted and never revealed on-chain.
- **Fair Battle Mechanism**: Battle outcomes are calculated privately within Arcium's trusted execution environment.
- **Verifiable Results**: While the computation is private, the results are verifiable and transparent.

### Arcium Computations

The project uses Arcium for confidential computations. Note that computations in Arcium network:

1. Usually take 10-30 minutes to complete on Devnet.
2. Can be prioritized by setting a higher priority fee (currently set to 5,000 lamports per compute unit).
3. Results can be checked using the included `check-battle-results.ts` utility.

## How to Use

### Prerequisites

- Solana CLI tools
- Node.js and npm/yarn
- Anchor framework

### Installation

```bash
git clone https://github.com/your-username/hidden-warrior.git
cd hidden-warrior
yarn install
```

### Build and Deploy

```bash
anchor build
anchor deploy
```

### Run Tests

```bash
anchor test
```

### Check Battle Results

After initiating a battle, you can check the results using:

```bash
ts-node check-battle-results.ts <TRANSACTION_SIGNATURE>
```

Replace `<TRANSACTION_SIGNATURE>` with the signature of your battle transaction.

## License

MIT 