The increment example demonstrates how to call a contract from another contract.

Open in Codespaces

Open in Codeanywhere

Run the Example
First go through the Setup process to get your development environment configured, then clone the v23.0.0 tag of soroban-examples repository:

git clone -b v23.0.0 https://github.com/stellar/soroban-examples

Or, skip the development environment setup and open this example in GitHub Codespaces or Code Anywhere.

To run the tests for the example, navigate to the increment directory, and use cargo test.

cd increment
cargo test

You should see the output:

running 1 test
test test::test ... ok

Code
increment/src/lib.rs
const COUNTER: Symbol = symbol_short!("COUNTER");

#[contract]
pub struct IncrementContract;

#[contractimpl]
impl IncrementContract {
    pub fn increment(env: Env) -> u32 {
        let mut count: u32 = env.storage().instance().get(&COUNTER).unwrap_or(0);
        log!(&env, "count: {}", count);

        count += 1;
        env.storage().instance().set(&COUNTER, &count);
        env.storage().instance().extend_ttl(50, 100);

        count
    }
}

Ref: https://github.com/stellar/soroban-examples/tree/v23.0.0/increment

How it Works
This contract will get a counter value from storage (or use the value 0 if no value has been stored yet), and increment this counter every time it's called.

Open the increment/src/lib.rs file or see the code above to follow along.

Contract Data Key
Contract data is associated with a key, which can be used at a later time to look up the value.

const COUNTER: Symbol = symbol_short!("COUNTER");

Symbol is a short (up to 32 characters long) string type with limited character space (only a-zA-Z0-9_ characters are allowed). Identifiers like contract function names and contract data keys are represented by Symbols.

The symbol_short!() macro is a convenient way to pre-compute short symbols up to 9 characters in length at compile time using Symbol::short. It generates a compile-time constant that adheres to the valid character set of letters (a-zA-Z), numbers (0-9), and underscores (_). If a symbol exceeds the 9-character limit, Symbol::new should be utilized for creating symbols at runtime.

Contract Data Access
let mut count: u32 = env
    .storage()
    .instance()
    .get(&COUNTER)
    .unwrap_or(0); // If no value set, assume 0.

The env.storage() function is used to access and update contract data. The executing contract is the only contract that can query or modify contract data that it has stored. The data stored is viewable on ledger anywhere the ledger is viewable, but contracts executing within the Soroban environment are restricted to their own data.

The get() function gets the current value associated with the counter key.

If no value is currently stored, the value given to unwrap_or(...) is returned instead.

Values stored as contract data and retrieved are transmitted from the environment and expanded into the type specified. In this case a u32. If the value can be expanded, the type returned will be a u32. Otherwise, if a developer cast it to be some other type, a panic would occur at the unwrap.

env.storage()
    .instance()
    .set(&COUNTER, &count);

The set() function stores the new count value against the key, replacing the existing value.

Managing Contract Data TTLs with extend_ttl()
env.storage().instance().extend_ttl(50, 100);

All contract data has a Time To Live (TTL), measured in ledgers, that must be periodically extended. If an entry's TTL is not periodically extended, the entry will eventually become "archived." You can learn more about this in the State Archival document.

For now, it's worth knowing that there are three kinds of storage: Persistent, Temporary, and Instance. This contract only uses Instance storage: env.storage().instance(). Every time the counter is incremented, this storage's TTL gets extended by 100 ledgers, or about 500 seconds.

Tests
Open the increment/src/test.rs file to follow along.

increment/src/test.rs
#[test]
fn test() {
    let env = Env::default();
    let contract_id = env.register(IncrementContract, ());
    let client = IncrementContractClient::new(&env, &contract_id);

    assert_eq!(client.increment(), 1);
    assert_eq!(client.increment(), 2);
    assert_eq!(client.increment(), 3);
}

In any test the first thing that is always required is an Env, which is the Soroban environment that the contract will run in.

let env = Env::default();

The contract is registered with the environment using the contract type.

let contract_id = env.register(IncrementContract, ());

All public functions within an impl block that is annotated with the #[contractimpl] attribute have a corresponding function generated in a generated client type. The client type will be named the same as the contract type with Client appended.

let client = IncrementContractClient::new(&env, &contract_id);

The test asserts that the result that is returned is as we expect.

assert_eq!(client.increment(), 1);
assert_eq!(client.increment(), 2);
assert_eq!(client.increment(), 3);

Build the Contracts
To build the contract into a .wasm file, use the stellar contract build command.

stellar contract build

The .wasm file should be found in the contract target directory after building the contract:

target/wasm32v1-none/release/soroban_increment_contract.wasm

Run the Contract
If you have stellar-cli installed, you can deploy the contract, and invoke the contract function.

Deploy
macOS/Linux
Windows (PowerShell)
stellar contract deploy \
    --wasm target/wasm32v1-none/release/soroban_increment_contract.wasm \
    --id a

Invoke
macOS/Linux
Windows (PowerShell)
stellar contract invoke \
    --wasm target/wasm32v1-none/release/soroban_events_contract.wasm \
    --id 1 \
    -- \
    increment

Result
The following output should occur the first time the code above is used.

1

The value will be incremented every time the contract function is invoked.

Did you find this page helpful?

Events
The events example demonstrates how to publish events from a contract. This example is an extension of the storing data example.

Whisk Changes
With the release of Whisk, Protocol 23, the syntax for publishing smart contract events has changed. In order to provide the most up-to-date information, this example has been updated to include the new patterns. Find more detailed information in the Rust SDK documentation.

Open in Codespaces

Open in Codeanywhere

Run the Example
First go through the Setup process to get your development environment configured, then clone the v23.0.0 tag of soroban-examples repository:

git clone -b v23.0.0 https://github.com/stellar/soroban-examples

Or, skip the development environment setup and open this example in GitHub Codespaces or Code Anywhere.

To run the tests for the example, navigate to the events directory, and use cargo test.

cd events
cargo test

You should see the output:

running 1 test
test test::test ... ok

Code
events/src/lib.rs
const COUNTER: Symbol = symbol_short!("COUNTER");

// Define two static topics for the event: "COUNTER" and "increment".
// Also set the data format to "single-value", which means that the event data
// payload will contain a single value not nested into any data structure.
#[contractevent(topics = ["COUNTER", "increment"], data_format = "single-value")]
struct IncrementEvent {
    count: u32,
}

#[contract]
pub struct IncrementContract;

#[contractimpl]
impl IncrementContract {
    /// Increment increments an internal counter, and returns the value.
    pub fn increment(env: Env) -> u32 {
        // Get the current count.
        let mut count: u32 = env.storage().instance().get(&COUNTER).unwrap_or(0); // If no value set, assume 0.

        // Increment the count.
        count += 1;

        // Save the count.
        env.storage().instance().set(&COUNTER, &count);

        // Publish an event about the increment occuring.
        // The event has two static topics ("COUNTER", "increment") and actual
        // count as the data payload.
        IncrementEvent { count }.publish(&env);

        // Return the count to the caller.
        count
    }
}

Ref: https://github.com/stellar/soroban-examples/tree/v23.0.0/events

How it Works
This example contract extends the increment example by publishing an event each time the counter is incremented.

Contract events let contracts emit information about what their contract is doing. Contracts can publish events creating a defined struct and publishing it to the smart contract environments.

First, the #[contractevent] struct must be defined

#[contractevent(topics = ["COUNTER", "increment"], data_format = "single-value")]
struct IncrementEvent {
    count: u32,
}

Then, inside the contract's function, we can create and publish the event with the relevant data.

IncrementEvent { count }.publish(&env);

Event Topics
Topics can be defined either statically or dynamically. In the sample code two static topics are used, which will be of the Symbol type: COUNTER and increment.

#[contractevent(topics = ["COUNTER", "increment"], ...)]

tip
The topics don't have to be made of the same type.

Topics can also be defined dynamically, inside the struct. In this case, the struct's snake_case name will be the first topic. For example, the following event will have two topics: the Symbol "increment", followed by an Address.

#[contractevent]
pub struct Increment {
    #[topic]
    addr: Address,
    count: u32,
}

Event Data
An event also contains a data object of any value or type including types defined by contracts using #[contracttype]. In the example the data is the u32 count. The data_format = "single-value" tells the event to publish the data alone, with no surrounding data structure.

#[contractevent(..., data_format = "single-value")]

Event data will, by default, conform to the data structure in the defined struct. The data_format can also be specified as vec or single-value. Again, please refer to the Rust SDK documentation for more details.

Publishing
Publishing an event is done by calling the publish function on the created event struct. The function returns nothing on success, and panics on failure. Possible failure reasons can include malformed inputs (e.g. topic count exceeds limit) and running over the resource budget (TBD). Once successfully published, the new event will be available to applications consuming the events.

IncrementEvent { count }.publish(&env);

caution
Published events are discarded if a contract invocation fails due to a panic, budget exhaustion, or when the contract returns an error.

Tests
Open the events/src/test.rs file to follow along.

events/src/test.rs
#[test]
fn test() {
    let env = Env::default();
    let contract_id = env.register(IncrementContract, ());
    let client = IncrementContractClient::new(&env, &contract_id);

    assert_eq!(client.increment(), 1);
    assert_eq!(
        env.events().all(),
        vec![
            &env,
            (
                contract_id.clone(),
                (symbol_short!("COUNTER"), symbol_short!("increment")).into_val(&env),
                1u32.into_val(&env)
            ),
        ]
    );
    assert_eq!(client.increment(), 2);
    assert_eq!(
        env.events().all(),
        vec![
            &env,
            (
                contract_id.clone(),
                (symbol_short!("COUNTER"), symbol_short!("increment")).into_val(&env),
                2u32.into_val(&env)
            ),
        ]
    );
    assert_eq!(client.increment(), 3);
    assert_eq!(
        env.events().all(),
        vec![
            &env,
            (
                contract_id,
                (symbol_short!("COUNTER"), symbol_short!("increment")).into_val(&env),
                3u32.into_val(&env)
            ),
        ]
    );
}

In any test the first thing that is always required is an Env, which is the Soroban environment that the contract will run in.

let env = Env::default();

The contract is registered with the environment using the contract type.

let contract_id = env.register(IncrementContract, ());

All public functions within an impl block that is annotated with the #[contractimpl] attribute have a corresponding function generated in a generated client type. The client type will be named the same as the contract type with Client appended. For example, in our contract the contract type is IncrementContract, and the client is named IncrementContractClient.

let client = IncrementContractClient::new(&env, &contract_id);

The example invokes the contract several times.

assert_eq!(client.increment(), 1);

The example asserts that the event was published.

assert_eq!(
    env.events().all(),
    vec![
        &env,
        (
            contract_id.clone(),
            (symbol_short!("COUNTER"), symbol_short!("increment")).into_val(&env),
            1u32.into_val(&env)
        ),
    ]
);

Build the Contract
To build the contract, use the stellar contract build command.

stellar contract build

A .wasm file should be outputted in the target directory:

target/wasm32v1-none/release/soroban_events_contract.wasm

Run the Contract
If you have stellar-cli installed, you can invoke contract functions in the using it.

macOS/Linux
Windows (PowerShell)
stellar contract invoke \
    --wasm target/wasm32v1-none/release/soroban_events_contract.wasm \
    --id 1 \
    -- \
    increment

The following output should occur using the code above.

📅 CAAA... - Success - Event: [{"symbol":"COUNTER"},{"symbol":"increment"}] = {"u32":1}
1

A single event is outputted, which is the contract event the contract published. The event contains the two topics, each a Symbol, and the data object containing the u32.


Simple Account
This example implements the smallest possible contract account: each require_auth call delegates to one ed25519 public key. It shows how to store that key, run __check_auth, and surface authorization failures. Use this as the baseline before moving to the Complex Account example for multisig or policy enforcement.

danger
Implementing a contract account requires a very good understanding of authentication and authorization and requires rigorous testing and review. The example here is not a full-fledged account contract - use it as an API reference only.

caution
While contract accounts are supported by the Stellar protocol and Soroban SDK, the full client support (such as transaction simulation) is still under development.

Open in Codespaces

Open in Codeanywhere

Run the Example
Finish the Setup checklist to install the Stellar CLI, Rust target, and required environment variables.
Clone the soroban-examples repository at the v23.0.0 tag:
git clone -b v23.0.0 https://github.com/stellar/soroban-examples

If you prefer not to install anything locally, launch the repo in GitHub Codespaces or Codeanywhere.
Run the tests from the simple_account directory:

cd simple_account
cargo test

Expected output:

running 1 test
test test::test_account ... ok

How it Works
Open simple_account/src/lib.rs. The contract keeps one piece of state: the owner's ed25519 public key.

Initialize the owner
simple_account/src/lib.rs
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Owner,
}

#[contractimpl]
impl SimpleAccount {
    pub fn init(env: Env, public_key: BytesN<32>) {
        if env.storage().instance().has(&DataKey::Owner) {
            panic!("owner is already set");
        }
        env.storage().instance().set(&DataKey::Owner, &public_key);
    }

Call init once to persist the owner's public key. Subsequent calls panic to prevent replacement of the key.

Implement __check_auth
simple_account/src/lib.rs
    #[allow(non_snake_case)]
    pub fn __check_auth(
        env: Env,
        signature_payload: BytesN<32>,
        signature: BytesN<64>,
        _auth_context: Vec<Context>,
    ) {
        let public_key: BytesN<32> = env
            .storage()
            .instance()
            .get(&DataKey::Owner)
            .unwrap();
        env.crypto()
            .ed25519_verify(&public_key, &signature_payload.into(), &signature);
    }
}

__check_auth runs whenever another contract invokes require_auth on this contract address. The implementation loads the stored key, verifies the signature, and panics on failure so the upstream require_auth call rejects. Once you need multiple keys or policy logic, follow the same pattern shown in Complex Account.

Tests
Open simple_account/src/test.rs. __check_auth is not exposed as a regular entry point, so tests call env.try_invoke_contract_check_auth to emulate the Soroban host and exercise the same path Soroban runs during require_auth.

simple_account/src/test.rs
#[test]
fn test_account() {
    let env = Env::default();
    let account_contract = SimpleAccountClient::new(&env, &env.register(SimpleAccount, ()));

    let signer = Keypair::generate(&mut thread_rng());
    account_contract.init(&signer.public.to_bytes().into_val(&env));

    let payload = BytesN::random(&env);
    env.try_invoke_contract_check_auth::<Error>(
        &account_contract.address,
        &payload,
        sign(&env, &signer, &payload),
        &vec![&env],
    )
    .unwrap();

    assert!(env
        .try_invoke_contract_check_auth::<Error>(
            &account_contract.address,
            &payload,
            BytesN::<64>::random(&env).into(),
            &vec![&env],
        )
        .is_err());
}

try_invoke_contract_check_auth mimics the host path for require_auth, so the test proves both the success case and a failure case with random bytes.

Follow the same structure for any account:

create a keypair and store the expected signer (for example, with init)
call try_invoke_contract_check_auth with a valid signature and assert it succeeds
call it again with an invalid signature or payload and assert it fails
Build the Contract
To produce the Wasm executable, run:

stellar contract build
# add --package soroban-simple-account-contract when building inside the soroban-examples workspace

The compiled file appears at target/wasm32v1-none/release/simple_account.wasm (the exact filename depends on your crate name).

Further Reading
Complex account example – adds multisig support and spend limits.
BLS signature contract – demonstrates custom signature schemes inside __check_auth.

Complex Account
Start with the Simple Account example to learn the single-signer basics. This Complex Account extends that baseline with multisig and customizable authorization policies. Any time an Address pointing at this contract instance is used, the logic defined here runs through the Soroban auth framework.

Contract accounts are exclusive to Soroban and can't be used to perform other Stellar operations.

danger
Implementing a contract account requires a very good understanding of authentication and authorization and requires rigorous testing and review. The example here is not a full-fledged account contract - use it as an API reference only.

caution
While contract accounts are supported by the Stellar protocol and Soroban SDK, the full client support (such as transaction simulation) is still under development.

Open in Codespaces

Open in Codeanywhere

Run the Example
First go through the Setup process to get your development environment configured, then clone the v23.0.0 tag of soroban-examples repository:

git clone -b v23.0.0 https://github.com/stellar/soroban-examples

Or, skip the development environment setup and open this example in GitHub Codespaces or Code Anywhere.

To run the tests for the example use cargo test.

cargo test -p soroban-account-contract

You should see the output:

running 1 test
test test::test_token_auth ... ok

How it Works
Open the account/src/lib.rs file to follow along.

Account contracts implement a special function __check_auth that takes the signature payload, signatures and authorization context. The function should error if auth is declined, otherwise auth will be approved.

This example contract uses ed25519 keys for signature verification and supports multiple equally weighted signers. It also implements a policy that allows setting per-token limits on transfers. The token can be spent beyond the limit only if every signature is provided.

For example, the user may initialize this contract with 2 keys and introduce 100 USDC spend limit. This way they can use a single key to sign their contract invocations and be sure that even if they sign a malicious transaction they won't spend more than 100 USDC.

Initialization
account/src/lib.rs
#[contract]
struct AccountContract;

#[contracttype]
#[derive(Clone)]
enum DataKey {
    SignerCnt,
    Signer(BytesN<32>),
    SpendLimit(Address),
}

...

#[contractimpl]
impl AccountContract {
    // Initialize the contract with a list of ed25519 public key ('signers').
    pub fn __constructor(env: Env, signers: Vec<BytesN<32>>) {
        // In reality this would need some additional validation on signers
        // (deduplication etc.).
        for signer in signers.iter() {
            env.storage().instance().set(&DataKey::Signer(signer), &());
        }
        env.storage()
            .instance()
            .set(&DataKey::SignerCnt, &signers.len());
    }

    ...
}

This account contract needs to work with the public keys explicitly. Here we initialize the contract with ed25519 keys.

We use constructor in order to ensure that the contract instance is created and initialized atomically (without constructor there is a risk that someone frontruns the initialization of the contract and sets their own public keys).

Policy modification
#[contractimpl]
impl AccountContract {
    ...

    // Adds a limit on any token transfers that aren't signed by every signer.
    // For the sake of simplicity of the example the limit is only applied on
    // a per-authorization basis; the 'real' limits should likely be time-based
    // instead.
    pub fn add_limit(env: Env, token: Address, limit: i128) {
        // The current contract address is the account contract address and has
        // the same semantics for `require_auth` call as any other account
        // contract address.
        // Note, that if a contract *invokes* another contract, then it would
        // authorize the call on its own behalf and that wouldn't require any
        // user-side verification.
        env.current_contract_address().require_auth();
        env.storage()
            .instance()
            .set(&DataKey::SpendLimit(token), &limit);
    }
}

This function allows users to set and modify the per-token spend limit described above. The neat trick here is that require_auth can be used for the current_contract_address(), i.e. the account contract may be used to verify authorization for its own administrative functions. This way there is no need to write duplicate authorization and authentication logic.

__check_auth
#[contracttype]
#[derive(Clone)]
pub struct AccSignature {
    pub public_key: BytesN<32>,
    pub signature: BytesN<64>,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum AccError {
    NotEnoughSigners = 1,
    NegativeAmount = 2,
    BadSignatureOrder = 3,
    UnknownSigner = 4,
}

...

#[contractimpl]
impl CustomAccountInterface for AccountContract {
    type Signature = Vec<AccSignature>;
    type Error = AccError;

    // This is the 'entry point' of the account contract and every account
    // contract has to implement it. `require_auth` calls for the Address of
    // this contract will result in calling this `__check_auth` function with
    // the appropriate arguments.
    //
    // This should return `()` if authentication and authorization checks have
    // been passed and return an error (or panic) otherwise.
    //
    // `__check_auth` takes the payload that needed to be signed, arbitrarily
    // typed signatures (`Vec<AccSignature>` contract type here) and authorization
    // context that contains all the invocations that this call tries to verify.
    //
    // `__check_auth` has to authenticate the signatures. It also may use
    // `auth_context` to implement additional authorization policies (like token
    // spend limits here).
    //
    // Soroban host guarantees that `__check_auth` is only being called during
    // `require_auth` verification and hence this may mutate its own state
    // without the need for additional authorization (for example, this could
    // store per-time-period token spend limits instead of just enforcing the
    // limit per contract call).
    //
    // Note, that `__check_auth` function shouldn't call `require_auth` on the
    // contract's own address in order to avoid infinite recursion.
    #[allow(non_snake_case)]
    fn __check_auth(
        env: Env,
        signature_payload: Hash<32>,
        signatures: Self::Signature,
        auth_context: Vec<Context>,
    ) -> Result<(), AccError> {
        // Perform authentication.
        authenticate(&env, &signature_payload, &signatures)?;

        let tot_signers: u32 = env
            .storage()
            .instance()
            .get::<_, u32>(&DataKey::SignerCnt)
            .unwrap();
        let all_signed = tot_signers == signatures.len();

        let curr_contract = env.current_contract_address();

        // This is a map for tracking the token spend limits per token. This
        // makes sure that if e.g. multiple `transfer` calls are being authorized
        // for the same token we still respect the limit for the total
        // transferred amount (and not the 'per-call' limits).
        let mut spend_left_per_token = Map::<Address, i128>::new(&env);
        // Verify the authorization policy.
        for context in auth_context.iter() {
            verify_authorization_policy(
                &env,
                &context,
                &curr_contract,
                all_signed,
                &mut spend_left_per_token,
            )?;
        }
        Ok(())
    }
}

__check_auth is a special function that account contracts implement. It will be called by the Soroban environment every time require_auth or require_auth_for_args is called for the address of the account contract.

Here it is implemented in two steps. First, authentication is performed using the signature payload and a vector of signatures. Second, authorization policy is enforced using the auth_context vector. This vector contains all the contract calls that are being authorized by the provided signatures.

__check_auth is a reserved function and can only be called by the Soroban environment in response to a call to require_auth. Any direct call to __check_auth will fail. This makes it safe to write to the account contract storage from __check_auth, as it's guaranteed to not be called in unexpected context. In this example it's possible to persist the spend limits without worrying that they'll be exhausted via a bad actor calling __check_auth directly.

Authentication
fn authenticate(
    env: &Env,
    signature_payload: &Hash<32>,
    signatures: &Vec<AccSignature>,
) -> Result<(), AccError> {
    for i in 0..signatures.len() {
        let signature = signatures.get_unchecked(i);
        if i > 0 {
            let prev_signature = signatures.get_unchecked(i - 1);
            if prev_signature.public_key >= signature.public_key {
                return Err(AccError::BadSignatureOrder);
            }
        }
        if !env
            .storage()
            .instance()
            .has(&DataKey::Signer(signature.public_key.clone()))
        {
            return Err(AccError::UnknownSigner);
        }
        env.crypto().ed25519_verify(
            &signature.public_key,
            &signature_payload.clone().into(),
            &signature.signature,
        );
    }
    Ok(())
}

Authentication here simply checks that the provided signatures are valid given the payload and also that they belong to the signers of this account contract.

Authorization policy
fn verify_authorization_policy(
    env: &Env,
    context: &Context,
    curr_contract: &Address,
    all_signed: bool,
    spend_left_per_token: &mut Map<Address, i128>,
) -> Result<(), AccError> {
    // There are no limitations when every signers signs the transaction.
    if all_signed {
        return Ok(());
    }
    let contract_context = match context {
        Context::Contract(c) => {
            // Allow modifying this contract only if every signer has signed for it.
            if &c.contract == curr_contract {
                return Err(AccError::NotEnoughSigners);
            }
            c
        }
        // Allow creating new contracts only if every signer has signed for it.
        Context::CreateContractHostFn(_) | Context::CreateContractWithCtorHostFn(_) => {
            return Err(AccError::NotEnoughSigners);
        }
    };

    ...
}

We verify the policy per Context. i.e. per one require_auth call for the address of this account. The policy for the account contract itself enforces every signer to have signed the method call.

fn verify_authorization_policy(
    env: &Env,
    context: &Context,
    curr_contract: &Address,
    all_signed: bool,
    spend_left_per_token: &mut Map<Address, i128>,
) -> Result<(), AccError> {
    ...

    // Besides the checks above we're only interested in functions that spend tokens.
    if contract_context.fn_name != TRANSFER_FN
        && contract_context.fn_name != APPROVE_FN
        && contract_context.fn_name != BURN_FN
    {
        return Ok(());
    }

    let spend_left: Option<i128> =
        if let Some(spend_left) = spend_left_per_token.get(contract_context.contract.clone()) {
            Some(spend_left)
        } else if let Some(limit_left) = env
            .storage()
            .instance()
            .get::<_, i128>(&DataKey::SpendLimit(contract_context.contract.clone()))
        {
            Some(limit_left)
        } else {
            None
        };

    // 'None' means that the contract is outside of the policy.
    if let Some(spend_left) = spend_left {
        // 'amount' is the third argument in both `approve` and `transfer`.
        // If the contract has a different signature, it's safer to panic
        // here, as it's expected to have the standard interface.
        let spent: i128 = contract_context
            .args
            .get(2)
            .unwrap()
            .try_into_val(env)
            .unwrap();
        if spent < 0 {
            return Err(AccError::NegativeAmount);
        }
        if !all_signed && spent > spend_left {
            return Err(AccError::NotEnoughSigners);
        }
        spend_left_per_token.set(contract_context.contract.clone(), spend_left - spent);
    }
    Ok(())
}

Then we check for the standard token function names and verify that for these function we don't exceed the spending limits.

Tests
Open the account/src/test.rs file to follow along.

Refer to another examples for the general information on the test setup.

Here we only look at some points specific to the account contracts.

fn sign(e: &Env, signer: &Keypair, payload: &BytesN<32>) -> Val {
    AccSignature {
        public_key: signer_public_key(e, signer),
        signature: signer
            .sign(payload.to_array().as_slice())
            .to_bytes()
            .into_val(e),
    }
    .into_val(e)
}

Unlike most of the contracts that may simply use Address, account contracts deal with the signature verification and hence need to actually sign the payloads.

let payload = BytesN::random(&env);
let token = Address::generate(&env);
// `__check_auth` can't be called directly, hence we need to use
// `try_invoke_contract_check_auth` testing utility that emulates being
// called by the Soroban host during a `require_auth` call.
env.try_invoke_contract_check_auth::<AccError>(
    &account_contract.address,
    &payload,
    vec![&env, sign(&env, &signers[0], &payload)].into(),
    &vec![
        &env,
        token_auth_context(&env, &token, Symbol::new(&env, "transfer"), 1000),
    ],
)
.unwrap();

__check_auth can't be called directly as regular contract functions, hence we need to use try_invoke_contract_check_auth testing utility that emulates being called by the Soroban host during a require_auth call.

// Add a spend limit of 1000 per 1 signer.
account_contract.add_limit(&token, &1000);
// Verify that this call needs to be authorized.
assert_eq!(
    env.auths(),
    std::vec![(
        account_contract.address.clone(),
        AuthorizedInvocation {
            function: AuthorizedFunction::Contract((
                account_contract.address.clone(),
                symbol_short!("add_limit"),
                (token.clone(), 1000_i128).into_val(&env),
            )),
            sub_invocations: std::vec![]
        }
    )]
);

Asserting the contract-specific error to try_invoke_contract_check_auth allows verifying the exact error code and makes sure that the verification has failed due to not having enough signers and not for any other reason.

It's a good idea for the account contract to have detailed error codes and verify that they are returned when they are expected.

// 1 signer no longer can perform the token operation that transfers more
// than 1000 units.
assert_eq!(
    env.try_invoke_contract_check_auth::<AccError>(
        &account_contract.address,
        &payload,
        vec![&env, sign(&env, &signers[0], &payload)].into(),
        &vec![
            &env,
            token_auth_context(&env, &token, Symbol::new(&env, "transfer"), 1001)
        ],
    )
    .err()
    .unwrap()
    .unwrap(),
    AccError::NotEnoughSigners
);

BLS Signature
The BLS signature example illustrates how to implement BLS signature verification inside a contract account.

This example is based off of the Complex Account example. Although the main goal is to illustrate the practical use of the BLS12-381 functionalities in a relevant setting.

It is good to have an understanding of how a contract account works, so walk through the Simple Account example first, but it is not required.

Open in Codespaces

Open in Codeanywhere

Background on BLS Signature
There are plenty of good resources on BLS signature, for example the "BLS12-381 For The Rest Of Us" has a section on BLS digital signature. BLS Signature for Busy People is a also a good resource for a quick overview. For full reference check out the IETF draft.

In short, we are verifying the following relation:

e
(
p
k
,
H
(
m
)
)
=
e
(
g
1
,
σ
)
e(pk,H(m))=e(g1,σ)
Where 
p
k
pk is the public key, 
H
(
m
)
H(m) is hash of the message onto the G2 group, 
g
1
g1 is the generator point in the G1 group and 
s
i
g
m
a
sigma is the signature. 
e
(
,
)
e(,) denotes the bilinear pairing between a point in G1 and a point in G2.

The nice thing about pairing based signature is it enables signature aggregation. I.e. if you have multiple signers pk_0 .. pk_n on the a single message, you can compute the aggregate public key 
p
k
a
g
g
pk 
agg
​
  by adding up all the public keys (recall each public key is just a point on the G1 group), the aggregate signature 
σ
a
g
g
σ 
agg
​
  by adding up individual signatures (which is just a point on the G2 group).

Then the aggregate signature verification is just

e
(
p
k
a
g
g
,
H
(
m
)
)
=
e
(
g
1
,
σ
a
g
g
)
e(pk 
agg
​
 ,H(m))=e(g1,σ 
agg
​
 )
with a single pairing on chain, you can verify N signatures on the same message in constant time. In general, n unique messages takes n + 1 pairing operations to verify all signatures.

Hash of message H(m)
The message will need to be hashed on the curve H(m) for pairing operation to be applied. We follow the approach outlined in RFC 9380 - Hashing to Elliptic Curves.

The hashing method requires a unique domain separation tag (DST), it is highly advisable that your application choose a unique DST. For the requirements of DST, refer to section 3.1 of the RFC,

tip
For digital signatures, the G1 and G2 groups can be used interchangeably. Public keys can be chosen as elements of G1 with signatures in G2, or the other way around. The choice involves trade-offs between execution speed and storage size. G1 offers smaller points and faster operations, whereas G2 has larger points and slower performance.

caution
The example presented below is intended for demonstration purpose only

It has not undergone security auditing.
It is not safe for use in production environments.
Implementing a production-safe signature scheme requires deep understanding of the underlying cryptography and security considerations. Use this at your own risk.

Run the Example
First go through the Setup process to get your development environment configured, then clone the v23.0.0 tag of soroban-examples repository:

git clone -b v23.0.0 https://github.com/stellar/soroban-examples

Or, skip the development environment setup and open this example in GitHub Codespaces or Code Anywhere.

To run the tests for the example, navigate to the bls_signature directory, and use cargo test.

cd bls_signature
cargo test

You should see the output:

running 1 test
test test::test ... ok

Code
bls_signature/src/lib.rs
#[contract]
pub struct IncrementContract;

// `DST `is the domain separation tag, intended to keep hashing inputs of your
// contract separate. Refer to section 3.1 in the [Hashing to Elliptic
// Curves](https://datatracker.ietf.org/doc/html/rfc9380) on requirements of
// DST.
const DST: &str = "BLSSIG-V01-CS01-with-BLS12381G2_XMD:SHA-256_SSWU_RO_";

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Owners,
    Counter,
    Dst,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum AccError {
    InvalidSignature = 1,
}

#[contractimpl]
impl IncrementContract {
    pub fn init(env: Env, agg_pk: BytesN<96>) {
        // Initialize the account contract essentials: the aggregated pubkey and
        // the DST. Because the message to be signed (which is
        // the hash of some call stack) is the same for all signers, we can
        // simply aggregate all signers (adding up the G1 pubkeys) and store it.
        env.storage().persistent().set(&DataKey::Owners, &agg_pk);
        env.storage()
            .instance()
            .set(&DataKey::Dst, &Bytes::from_slice(&env, DST.as_bytes()));
        // initialize the counter, i.e. the business logic this signer contract
        // guards
        env.storage().instance().set(&DataKey::Counter, &0_u32);
    }

    pub fn increment(env: Env) -> u32 {
        env.current_contract_address().require_auth();
        let mut count: u32 = env.storage().instance().get(&DataKey::Counter).unwrap_or(0);
        count += 1;
        env.storage().instance().set(&DataKey::Counter, &count);
        count
    }
}

#[contractimpl]
impl CustomAccountInterface for IncrementContract {
    type Signature = BytesN<192>;

    type Error = AccError;

    #[allow(non_snake_case)]
    fn __check_auth(
        env: Env,
        signature_payload: Hash<32>,
        agg_sig: Self::Signature,
        _auth_contexts: Vec<Context>,
    ) -> Result<(), AccError> {
        // The sdk module containing access to the bls12_381 functions
        let bls = env.crypto().bls12_381();

        // Retrieve the aggregated pubkey and the DST from storage
        let agg_pk: BytesN<96> = env.storage().persistent().get(&DataKey::Owners).unwrap();
        let dst: Bytes = env.storage().instance().get(&DataKey::Dst).unwrap();

        // This is the negative of g1 (generator point of the G1 group)
        let neg_g1 = G1Affine::from_bytes(bytesn!(&env, 0x17f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bb114d1d6855d545a8aa7d76c8cf2e21f267816aef1db507c96655b9d5caac42364e6f38ba0ecb751bad54dcd6b939c2ca));
        // Hash the signature_payload i.e. the msg being signed and to be
        // verified into a point in G2
        let msg_g2 = bls.hash_to_g2(&signature_payload.into(), &dst);

        // Prepare inputs to the pairing function
        let vp1 = vec![&env, G1Affine::from_bytes(agg_pk), neg_g1];
        let vp2 = vec![&env, msg_g2, G2Affine::from_bytes(agg_sig)];

        // Perform the pairing check, i.e. e(pk, msg)*e(-g1, sig) == 1, which is
        // equivalent to checking `e(pk, msg) == e(g1, sig)`.
        // The LHS = e(sk * g1, msg) = sk * e(g1, msg) = e(g1, sk * msg) = e(g1, sig),
        // thus it must equal to the RHS if the signature matches.
        if !bls.pairing_check(vp1, vp2) {
            return Err(AccError::InvalidSignature);
        }
        Ok(())
    }
}


Ref: https://github.com/stellar/soroban-examples/tree/v23.0.0/bls_signature

How it Works
The example contract stores a counter that can only be incremented if a set of owners have approved it.

Open the bls_signature/src/lib.rs file or see the code above to follow along.

The Contract
#[contract]
pub struct IncrementContract;

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Owners,
    Counter,
    Dst,
}

#[contractimpl]
impl IncrementContract {
    pub fn init(env: Env, agg_pk: BytesN<96>) {
        // Initialize the account contract essentials: the aggregated pubkey and
        // the DST. Because the message to be signed (which is
        // the hash of some call stack) is the same for all signers, we can
        // simply aggregate all signers (adding up the G1 pubkeys) and store it.
        env.storage().persistent().set(&DataKey::Owners, &agg_pk);
        env.storage()
            .instance()
            .set(&DataKey::Dst, &Bytes::from_slice(&env, DST.as_bytes()));
        // initialize the counter, i.e. the business logic this signer contract
        // guards
        env.storage().instance().set(&DataKey::Counter, &0_u32);
    }

    pub fn increment(env: Env) -> u32 {
        env.current_contract_address().require_auth();
        let mut count: u32 = env.storage().instance().get(&DataKey::Counter).unwrap_or(0);
        count += 1;
        env.storage().instance().set(&DataKey::Counter, &count);
        count
    }
}

This contract is fairly simple and standard. On init(), it initializes the aggregate public key of all the owners, the domain separation tag DST, and initializes the counter to 0.

It contains a single function increment which calls require_auth that will check the authorization condition defined later, and if success, increment and return the counter.

BLS Signature verification
#[contractimpl]
impl CustomAccountInterface for IncrementContract {
    type Signature = BytesN<192>;

    type Error = AccError;

    #[allow(non_snake_case)]
    fn __check_auth(
        env: Env,
        signature_payload: Hash<32>,
        agg_sig: Self::Signature,
        _auth_contexts: Vec<Context>,
    ) -> Result<(), AccError> {
        // The sdk module containing access to the bls12_381 functions
        let bls = env.crypto().bls12_381();

        // Retrieve the aggregated pubkey and the DST from storage
        let agg_pk: BytesN<96> = env.storage().persistent().get(&DataKey::Owners).unwrap();
        let dst: Bytes = env.storage().instance().get(&DataKey::Dst).unwrap();

        // This is the negative of g1 (generator point of the G1 group)
        let neg_g1 = G1Affine::from_bytes(bytesn!(&env, 0x17f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bb114d1d6855d545a8aa7d76c8cf2e21f267816aef1db507c96655b9d5caac42364e6f38ba0ecb751bad54dcd6b939c2ca));
        // Hash the signature_payload i.e. the msg being signed and to be
        // verified into a point in G2
        let msg_g2 = bls.hash_to_g2(&signature_payload.into(), &dst);

        // Prepare inputs to the pairing function
        let vp1 = vec![&env, G1Affine::from_bytes(agg_pk), neg_g1];
        let vp2 = vec![&env, msg_g2, G2Affine::from_bytes(agg_sig)];

        // Perform the pairing check, i.e. e(pk, msg)*e(-g1, sig) == 1, which is
        // equivalent to checking `e(pk, msg) == e(g1, sig)`.
        // The LHS = e(sk * g1, msg) = sk * e(g1, msg) = e(g1, sk * msg) = e(g1, sig),
        // thus it must equal to the RHS if the signature matches.
        if !bls.pairing_check(vp1, vp2) {
            return Err(AccError::InvalidSignature);
        }
        Ok(())
    }
}


The CustomAccountInterface::__check_auth function implements the custom signature verification logic for this account.

env.crypto().bls12_381() initializes the bls12_381 module from which the BLS12-381 functions are available. The signature_payload contains the payload that was signed.

bls.hash_to_g2(&signature_payload.into(), &dst) hashes the message into the G2 group. agg_sig contains the aggregate signature which is another point in G2.

To perform the signature verification, we construct two vectors Vec<G1Affine> and Vec<G2Affine>, and call bls.pairing_check on them. The pairing check function performs e(pk, msg)*e(-g1, sig) == 1 which is equivalent to checking e(pk, msg) == e(g1, sig).

Tests
Open the bls_signature/src/test.rs file to follow along.

bls_signature/src/test.rs
#[test]
fn test() {
    let env = Env::default();
    let pk = aggregate_pk_bytes(&env);
    env.mock_all_auths();

    let client = create_client(&env);
    client.init(&pk);
    let payload = BytesN::random(&env);
    let sig_val = sign_and_aggregate(&env, &payload.clone().into()).to_val();

    env.try_invoke_contract_check_auth::<AccError>(&client.address, &payload, sig_val, &vec![&env])
        .unwrap();
    env.cost_estimate().budget().print();
}

Most of what's here is needed in order to create the contract client and ensure the invocation of its CustomAccountInterface implementation for signature authorization. After the setup, calling env.try_invoke_contract_check_auth on the client will invoke the __check_auth logic we've defined in our contract.

The invocation will return nothing on success, and will panic on failure. env.cost_estimate().budget().print() at the end prints out the budget.

Signature aggregation
We first declare 10 random key pairs. These will be used as the signers of this test contract.

#[derive(Debug)]
pub struct KeyPair {
    pub sk: [u8; 32],
    pub pk: [u8; 96],
}

static KEY_PAIRS: &[KeyPair] = &[
    KeyPair {
        sk: hex!("18a5ac3cfa6d0b10437a92c96f553311fc0e25500d691ae4b26581e6f925ec83"),
        pk: hex!("0914e32703bad05ccf4180e240e44e867b26580f36e09331997b2e9effe1f509b1a804fc7ba1f1334c8d41f060dd72550901c5549caef45212a236e288a785d762a087092c769bfa79611b96d73521ddd086b7e05b5c7e4210f50c2ee832e183"),
    },
    KeyPair {
        sk: hex!("738dbecafa122ee3c953f07e78461a4281cadec00c869098bac48c8c57b63374"),
        pk: hex!("05f4708a013699229f67d0e16f7c2af8a6557d6d11b737286cfb9429e092c31c412f623d61c7de259c33701aa5387b5004e2c03e8b7ea2740b10a5b4fd050eecca45ccf5588d024cbb7adc963006c29d45a38cb7a06ce2ac45fce52fc0d36572"),
    },
    KeyPair {
        sk: hex!("4bff25b53f29c8af15cf9b8e69988c3ff79c80811d5027c80920f92fad8d137d"),
        pk: hex!("18d0fef68a72e0746f8481fa72b78f945bf75c3a1e036fbbde62a421d8f9568a2ded235a27ad3eb0dc234b298b54dd540f61577bc4c6e8842f8aa953af57a6783924c479e78b0d4959038d3d108b3f6dc6a1b02ec605cb6d789af16cfe67f689"),
    },
    KeyPair {
        sk: hex!("2110f7dae25c4300e1a9681bad6311a547269dba69e94efd342cc208ff50813b"),
        pk: hex!("1643b04cc21f8af9492509c51a6e20e67fa7923f4fbd52f6fcf73c6a4013f864e3e29eb03f54d234582250ebb5df21140381d0c735e868adfe62f85cf8e85d279864333dbe70656a5f35ebc52c5b497f1c65c7a0144bb0c9a1d843f1a8fb9979"),
    },
    KeyPair {
        sk: hex!("1e4b6d54ac58d317cbe6fb0472c3cbf2e60ea157edea21354cbc198770f81448"),
        pk: hex!("02286d1a83a93f35c3461dd71d0840e83e1cd3275ee1af1bfd90ec2366485e9f7f18730f5b686f4810480f1ce5c63dca13a2fac1774aa4e22c29abb9280796d72a2bd0ef963dc76fd45090012bae4a727a6dce49550d9bc9776705f825e24731"),
    },
    KeyPair {
        sk: hex!("471145761f5cd9d0a9a511f1a80657edfcddc43424e4a5582040ea75c4649909"),
        pk: hex!("0b7920a3f2a50cfd6dc132a46b7163d3f7d6b1d03d9fcf450eb05dfa89991a269e707e3412270dc422b664d7adda782c11c973232e975ef0d4b4fb5626b563df542fd1862f80bce17cd09bcbce8884bdda4ac9286bf94854dd29cd511a9103a7"),
    },
    KeyPair {
        sk: hex!("1914beab355b0a86a7bcd37f2e036a9c2c6bff7f16d8bf3e23e42b7131b44701"),
        pk: hex!("1872237fb7ceccc1a6e85f83988c226cc47db75496e41cf20e8a4b93e8fd5e91d0cdcc3b2946a352223ec2b7817a2aae0dc4e6bb7b97c855828670362fcbd0ad6453f28e4fa4b7a075ac8bb1d69a4a1bb8c6723900fead307239f04a9bcec0ad"),
    },
    KeyPair {
        sk: hex!("46b19b928638068780ba82e76dfeaeaf5c37790cdf37f580e206dc6599c72dc7"),
        pk: hex!("0fd1a6b1e46b83a197bbf1dc2a854d024caa5ead5a54893c9767392c837d7c070e86a9206ddba1801332f9d74e0f78e9175419ccc40a966bf4c12a7f8500519e2b83cebd61e32121379911925bf7ae6d2c0d8ec4dcc411d4bbcd14763c1a9d31"),
    },
    KeyPair {
        sk: hex!("0ce3cd1dcaecf002715228aeb0645c6a7fd9990ace3d79515c547dac120bb9f7"),
        pk: hex!("19f7e9dcd4ce2bef92180b60d0c7c7b48b1924a36f9fbb93e9ecb8acb3219e26033b83facd4dc6d2e3f9fa0fffafeca8168bd4824e31dc9dfd977fbf037210508bc807c1a6d20f98a044911f6b689328f3f25dd35a6c05e8c6ac3ac6ef0def91"),
    },
    KeyPair {
        sk: hex!("6b4b27ba3ffc953eff3b974142cdac75f98c8c4ab26f93d5adfd49da5d462c3f"),
        pk: hex!("15f55ec5572026d6c3c7c62b3ce3c5d7539045e9f492f2b1b0860c0af5f5f6b34531dfe4626a92d5c23ac6ad44330cf40e63a8a7234edbb41539c5484eff2cd23b2f0d502a7fd74501b1a05ffee29b24e79cb1ee9fb9b804d84f486283101ee0"),
    },
];


We aggregate the signer public keys, by first converting the bytes into G1Affine, then add them all up.

fn aggregate_pk_bytes(env: &Env) -> BytesN<96> {
    let bls = env.crypto().bls12_381();
    let mut agg_pk = G1Affine::from_bytes(BytesN::from_array(env, &KEY_PAIRS[0].pk));
    for i in 1..KEY_PAIRS.len() {
        let pk = G1Affine::from_bytes(BytesN::from_array(env, &KEY_PAIRS[i].pk));
        agg_pk = bls.g1_add(&agg_pk, &pk);
    }
    agg_pk.to_bytes()
}

To produce the signature, the message will first be hashed into G2 via bls.hash_to_g2. Here we use our own defined DST.

To aggregate the signatures, we first produce individual signatures by having each signer sign the message. This means multiplying the secret key by the message's G2 point. Then we add them all up. Here we use g2_msm, by an array of message (Vec<G2Affine>) points and an the array of secret keys (Vec<Fr>) and it computes their inner-product which is the aggregate signature we want.

const DST: &str = "BLSSIG-V01-CS01-with-BLS12381G2_XMD:SHA-256_SSWU_RO_";

fn sign_and_aggregate(env: &Env, msg: &Bytes) -> BytesN<192> {
    let bls = env.crypto().bls12_381();
    let mut vec_sk: Vec<Fr> = vec![env];
    for kp in KEY_PAIRS {
        vec_sk.push_back(Fr::from_bytes(BytesN::from_array(env, &kp.sk)));
    }
    let dst = Bytes::from_slice(env, DST.as_bytes());
    let msg_g2 = bls.hash_to_g2(&msg, &dst);
    let vec_msg: Vec<G2Affine> = vec![
        env,
        msg_g2.clone(),
        msg_g2.clone(),
        msg_g2.clone(),
        msg_g2.clone(),
        msg_g2.clone(),
        msg_g2.clone(),
        msg_g2.clone(),
        msg_g2.clone(),
        msg_g2.clone(),
        msg_g2.clone(),
    ];
    bls.g2_msm(vec_msg, vec_sk).to_bytes()
}

Running this test will produce the following budget output (some portion of the output omitted for brevity), the total CPU consumption for signature verification is around 31M. And you can add as many additional public keys as you like. In general pairing_check is a function with linear cost, so the more unique messages that needs to be signed, the higher cost. Here because all signers sign the same content (hash of the call stack of this contract), we can do this in constant time.

---- test::test stdout ----
=================================================================
Cpu limit: 100000000; used: 31143102
Mem limit: 41943040; used: 159903
=================================================================
CostType                           cpu_insns      mem_bytes
WasmInsnExec                       0              0
MemAlloc                           23516          5000

[... previous output omitted for brevity ...]

VerifyEcdsaSecp256r1Sig            0              0
Bls12381EncodeFp                   2644           0
Bls12381DecodeFp                   11820          0
Bls12381G1CheckPointOnCurve        3868           0
Bls12381G1CheckPointInSubgroup     1461020        0
Bls12381G2CheckPointOnCurve        11842          0
Bls12381G2CheckPointInSubgroup     2115644        0
Bls12381G1ProjectiveToAffine       0              0
Bls12381G2ProjectiveToAffine       0              0
Bls12381G1Add                      0              0
Bls12381G1Mul                      0              0
Bls12381G1Msm                      0              0
Bls12381MapFpToG1                  0              0
Bls12381HashToG1                   0              0
Bls12381G2Add                      0              0
Bls12381G2Mul                      0              0
Bls12381G2Msm                      0              0
Bls12381MapFp2ToG2                 0              0
Bls12381HashToG2                   7052263        6816
Bls12381Pairing                    20447400       148148
Bls12381FrFromU256                 0              0
Bls12381FrToU256                   0              0
Bls12381FrAddSub                   0              0
Bls12381FrMul                      0              0
Bls12381FrPow                      0              0
Bls12381FrInv                      0              0
=================================================================

Build the Contract
To build the contract into a .wasm file, use the stellar contract build command.

stellar contract build

The .wasm file should be found in the target directory after building:

target/wasm32v1-none/release/soroban_bls_signature_contract.wasm

Custom Types
The custom types example demonstrates how to define your own data structures that can be stored on the ledger, or used as inputs and outputs to contract invocations. This example is an extension of the storing data example.

Open in Codespaces

Open in Codeanywhere

Run the Example
First go through the Setup process to get your development environment configured, then clone the v23.0.0 tag of soroban-examples repository:

git clone -b v23.0.0 https://github.com/stellar/soroban-examples

Or, skip the development environment setup and open this example in GitHub Codespaces or Code Anywhere.

To run the tests for the example, navigate to the custom_types directory, and use cargo test.

cd custom_types
cargo test

You should see the output:

running 1 test
test test::test ... ok

Code
custom_types/src/lib.rs
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct State {
    pub count: u32,
    pub last_incr: u32,
}

const STATE: Symbol = symbol_short!("STATE");

#[contract]
pub struct IncrementContract;

#[contractimpl]
impl IncrementContract {
    /// Increment increments an internal counter, and returns the value.
    pub fn increment(env: Env, incr: u32) -> u32 {
        // Get the current count.
        let mut state = Self::get_state(env.clone());

        // Increment the count.
        state.count += incr;
        state.last_incr = incr;

        // Save the count.
        env.storage().instance().set(&STATE, &state);

        // Return the count to the caller.
        state.count
    }
    /// Return the current state.
    pub fn get_state(env: Env) -> State {
        env.storage().instance().get(&STATE).unwrap_or(State {
            count: 0,
            last_incr: 0,
        }) // If no value set, assume 0.
    }
}

Ref: https://github.com/stellar/soroban-examples/tree/v23.0.0/custom_types

How it Works
Custom types are defined using the #[contracttype] attribute on either a struct or an enum.

Open the custom_types/src/lib.rs file to follow along.

Custom Type: Struct
Structs are stored on ledger as a map of key-value pairs, where the key is up to a 32 character string representing the field name, and the value is the value encoded.

Field names must be no more than 32 characters.

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct State {
    pub count: u32,
    pub last_incr: u32,
}

Custom Type: Enum
The example does not contain enums, but enums may also be contract types.

Enums containing unit and tuple variants are stored on ledger as a two element vector, where the first element is the name of the enum variant as a string up to 32 characters in length, and the value is the value if the variant has one.

Only unit variants and single value variants, like A and B below, are supported.

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Enum {
    A,
    B(...),
}

Enums containing integer values are stored on ledger as the u32 value.

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Enum {
    A = 1,
    B = 2,
}

Using Types in Functions
Types that have been annotated with #[contracttype] can be stored as contract data and retrieved later.

Types can also be used as inputs and outputs on contract functions.

/// Increment increments an internal counter, and returns the value.
pub fn increment(env: Env, incr: u32) -> u32 {
    // Get the current count.
    let mut state = Self::get_state(env.clone());

    // Increment the count.
    state.count += incr;
    state.last_incr = incr;

    // Save the count.
    env.storage().instance().set(&STATE, &state);

    // Return the count to the caller.
    state.count
}

/// Return the current state.
pub fn get_state(env: Env) -> State {
    env.storage().instance().get(&STATE).unwrap_or(State {
        count: 0,
        last_incr: 0,
    }) // If no value set, assume 0.
}

Tests
Open the custom_types/src/test.rs file to follow along.

custom_types/src/test.rs
#[test]
fn test() {
    let env = Env::default();
    let contract_id = env.register(IncrementContract, ());
    let client = IncrementContractClient::new(&env, &contract_id);

    assert_eq!(client.increment(&1), 1);
    assert_eq!(client.increment(&10), 11);
    assert_eq!(
        client.get_state(),
        State {
            count: 11,
            last_incr: 10
        }
    );
}

In any test the first thing that is always required is an Env, which is the Soroban environment that the contract will run in.

let env = Env::default();

The contract is registered with the environment using the contract type.

let contract_id = env.register(IncrementContract, ());

All public functions within an impl block that is annotated with the #[contractimpl] attribute have a corresponding function generated in a generated client type. The client type will be named the same as the contract type with Client appended. For example, in our contract the contract type is IncrementContract, and the client is named IncrementContractClient.

let client = IncrementContractClient::new(&env, &contract_id);

The test invokes the increment function on the registered contract that causes the State type to be stored and updated a couple times.

assert_eq!(client.increment(&1), 1);
assert_eq!(client.increment(&10), 11);

The test then invokes the get_state function to get the State value that was stored, and can assert on its values.

assert_eq!(
    client.get_state(),
    State {
        count: 11,
        last_incr: 10
    }
);

Build the Contract
To build the contract, use the stellar contract build command.

stellar contract build

A .wasm file should be outputted in the target directory:

target/wasm32v1-none/release/soroban_custom_types_contract.wasm

Run the Contract
If you have stellar-cli installed, you can deploy and invoke contract function.

macOS/Linux
Windows (PowerShell)
stellar contract invoke \
    --id CACDYF3CYMJEJTIVFESQYZTN67GO2R5D5IUABTCUG3HXQSRXCSOROBAN \
    --source-account alice \
    --network testnet \
    -- \
    increment \
    --incr 5

The following output should occur using the code above.

5

Run it a few more times with different increment amounts to watch the count change.

Use the stellar-cli to inspect what the counter is after a few runs.

stellar contract read --id 1 --key STATE

STATE,"{""count"":25,""last_incr"":15}"

Errors
The errors example demonstrates how to define and generate errors in a contract that invokers of the contract can understand and handle. This example is an extension of the storing data example.

Open in Codespaces

Open in Codeanywhere

Run the Example
First go through the Setup process to get your development environment configured, then clone the v23.0.0 tag of soroban-examples repository:

git clone -b v23.0.0 https://github.com/stellar/soroban-examples

Or, skip the development environment setup and open this example in GitHub Codespaces or Code Anywhere.

To run the tests for the example, navigate to the errors directory, and use cargo test.

cd errors
cargo test

You should see output that begins like this:

running 2 tests
test test::test ... ok
test test::test_panic - should panic ... ok

[Diagnostic Event] contract:CAAA..., topics:[log], data:["count: {}", 0]
[Diagnostic Event] contract:CAAA..., topics:[log], data:["count: {}", 1]
[Diagnostic Event] contract:CAAA..., topics:[log], data:["count: {}", 2]
[Diagnostic Event] contract:CAAA..., topics:[log], data:["count: {}", 3]
[Diagnostic Event] contract:CAAA..., topics:[log], data:["count: {}", 4]
[Diagnostic Event] contract:CAAA..., topics:[log], data:["count: {}", 5]
[Failed Diagnostic Event (not emitted)] contract:CAAA..., topics:[log], data:["count: {}", 5]

thread 'test::test_panic' panicked at .../src/host.rs: HostError: Error(Contract, #1)

Event log (newest first):
   0: [Diagnostic Event] topics:[error, Error(Contract, #1)], data:"escalating error to panic"
   1: [Diagnostic Event] topics:[error, Error(Contract, #1)], data:["contract call failed", increment, []]
   2: [Failed Diagnostic Event (not emitted)] contract:CAAA..., topics:[error, Error(Contract, #1)], data:"escalating Ok(ScErrorType::Contract) frame-exit to Err"
   3: [Failed Diagnostic Event (not emitted)] contract:CAAA..., topics:[fn_return, increment], data:Error(Contract, #1)
   4: [Failed Diagnostic Event (not emitted)] contract:CAAA..., topics:[log], data:["count: {}", 5]
   5: [Diagnostic Event] topics:[fn_call, CAAA..., increment], data:Void
...

successes:
    test::test
    test::test_panic

test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.16s


Code
errors/src/lib.rs
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    LimitReached = 1,
}

const COUNTER: Symbol = symbol_short!("COUNTER");
const MAX: u32 = 5;

#[contract]
pub struct IncrementContract;

#[contractimpl]
impl IncrementContract {
    /// Increment increments an internal counter, and returns the value. Errors
    /// if the value is attempted to be incremented past 5.
    pub fn increment(env: Env) -> Result<u32, Error> {
        // Get the current count.
        let mut count: u32 = env.storage().instance().get(&COUNTER).unwrap_or(0); // If no value set, assume 0.
        log!(&env, "count: {}", count);

        // Increment the count.
        count += 1;

        // Check if the count exceeds the max.
        if count <= MAX {
            // Save the count.
            env.storage().instance().set(&COUNTER, &count);

            // Return the count to the caller.
            Ok(count)
        } else {
            // Return an error if the max is exceeded.
            Err(Error::LimitReached)
        }
    }
}

Ref: https://github.com/stellar/soroban-examples/tree/v23.0.0/errors

How it Works
Open the errors/src/lib.rs file to follow along.

Defining an Error
Contract errors are Rust u32 enums where every variant of the enum is assigned an integer. The #[contracterror] attribute is used to set the error up so it can be used in the return value of contract functions.

The enum has some constraints:

It must have the #[repr(u32)] attribute.
It must have the #[derive(Copy)] attribute.
Every variant must have an explicit integer value assigned.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    LimitReached = 1,
}

Contract errors cannot be stored as contract data, and therefore cannot be used as types on fields of contract types.

tip
If an error is returned from a function anything the function has done is rolled back. If ledger entries have been altered, or contract data stored, all those changes are reverted and will not be persisted.

Returning an Error
Errors can be returned from contract functions by returning Result<_, E>.

The increment function returns a Result<u32, Error>, which means it returns Ok(u32) in the successful case, and Err(Error) in the error case.

pub fn increment(env: Env) -> Result<u32, Error> {
    // ...
    if count <= MAX {
        // ...
        Ok(count)
    } else {
        // ...
        Err(Error::LimitReached)
    }
}

Panicking with an Error
Errors can also be panicked instead of being returned from the function.

The increment function could also be written as follows with a u32 return value. The error can be passed to the environment using the panic_with_error! macro.

pub fn increment(env: Env) -> u32 {
    // ...
    if count <= MAX {
        // ...
        count
    } else {
        // ...
        panic_with_error!(&env, Error::LimitReached)
    }
}

caution
Functions that do not return a Result<_, E> type do not include in their specification what the possible error values are. This makes it more difficult for other contracts and clients to integrate with the contract. However, this might be ideal if the errors are diagnostic and debugging, and not intended to be handled.

Tests
Open the errors/src/test.rs file to follow along.

errors/src/test.rs
#[test]
fn test() {
    let env = Env::default();
    let contract_id = env.register(IncrementContract, ());
    let client = IncrementContractClient::new(&env, &contract_id);

    assert_eq!(client.try_increment(), Ok(Ok(1)));
    assert_eq!(client.try_increment(), Ok(Ok(2)));
    assert_eq!(client.try_increment(), Ok(Ok(3)));
    assert_eq!(client.try_increment(), Ok(Ok(4)));
    assert_eq!(client.try_increment(), Ok(Ok(5)));
    assert_eq!(client.try_increment(), Err(Ok(Error::LimitReached)));

    std::println!("{}", env.logs().all().join("\n"));
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #1)")]
fn test_panic() {
    let env = Env::default();
    let contract_id = env.register(IncrementContract, ());
    let client = IncrementContractClient::new(&env, &contract_id);

    assert_eq!(client.increment(), 1);
    assert_eq!(client.increment(), 2);
    assert_eq!(client.increment(), 3);
    assert_eq!(client.increment(), 4);
    assert_eq!(client.increment(), 5);
    client.increment();
}

In any test the first thing that is always required is an Env, which is the Soroban environment that the contract will run in.

let env = Env::default();

The contract is registered with the environment using the contract type.

let contract_id = env.register(IncrementContract, ());

All public functions within an impl block that is annotated with the #[contractimpl] attribute have a corresponding function generated in a generated client type. The client type will be named the same as the contract type with Client appended. For example, in our contract the contract type is IncrementContract, and the client is named IncrementContractClient.

let client = IncrementContractClient::new(&env, &contract_id);

Two functions are generated for every contract function, one that returns a Result<>, and the other that does not handle errors and panics if an error occurs.

try_increment
In the first test the try_increment function is called and returns Result<Result<u32, _>, Result<Error, InvokeError>>.

assert_eq!(client.try_increment(), Ok(Ok(5)));
assert_eq!(client.try_increment(), Err(Ok(Error::LimitReached)));

If the function call is successful, Ok(Ok(u32)) is returned.
If the function call is successful but returns a value that is not a u32, Ok(Err(_)) is returned.
If the function call is unsuccessful and fails with an error in the Error enum, Err(Ok(Error)) is returned.
If the function call is unsuccessful but returns an error code not in the Error enum, or returns a system error code, Err(Err(InvokeError)) is returned and the InvokeError can be inspected.
increment
In the second test the increment function is called and returns u32. When the last call is made the function panics.

assert_eq!(client.increment(), 5);
client.increment();

If the function call is successful, u32 is returned.
If the function call is successful but returns a value that is not a u32, a panic occurs.
If the function call is unsuccessful, a panic occurs.
Build the Contract
To build the contract, use the stellar contract build command.

stellar contract build

A .wasm file should be outputted in the target directory:

target/wasm32v1-none/release/soroban_errors_contract.wasm

Run the Contract
Let's deploy the contract to Testnet so we can run it. The value provided as --source-account was set up in our Getting Started guide; please change accordingly if you created a different identity.

macOS/Linux
Windows (PowerShell)
stellar contract deploy \
  --wasm target/wasm32v1-none/release/soroban_errors_contract.wasm \
  --source-account alice \
  --network testnet

The command above will output the contract id, which in our case is CA4KWO3HL6M5F5MZ5ITVFLCQ6ZM2GDSP2NOTNXOT4GIRECQOVX3I6CXL.

Now that we've deployed the contract, we can invoke it.

macOS/Linux
Windows (PowerShell)
stellar contract invoke \
    --id CA4KWO3HL6M5F5MZ5ITVFLCQ6ZM2GDSP2NOTNXOT4GIRECQOVX3I6CXL \
    --network testnet \
    --source-account alice \
    -- \
    increment

Run the command a few times and on the 6th invocation you should see an error like this:

❌ error: transaction simulation failed: HostError: Error(Contract, #1)

Event log (newest first):
   0: [Diagnostic Event] contract:CA4KWO3HL6M5F5MZ5ITVFLCQ6ZM2GDSP2NOTNXOT4GIRECQOVX3I6CXL, topics:[error, Error(Contract, #1)], data:"escalating Ok(ScErrorType::Contract) frame-exit to Err"
   1: [Diagnostic Event] topics:[fn_call, CA4KWO3HL6M5F5MZ5ITVFLCQ6ZM2GDSP2NOTNXOT4GIRECQOVX3I6CXL, increment], data:Void


To retrieve the current counter value, use the command stellar contract read.

macOS/Linux
Windows (PowerShell)
stellar contract read \
  --id CA4KWO3HL6M5F5MZ5ITVFLCQ6ZM2GDSP2NOTNXOT4GIRECQOVX3I6CXL \
  --network testnet \
  --source-account alice \
  --durability persistent \
  --output json

Logging
The logging example demonstrates how to log for the purpose of debugging.

Open in Codespaces

Open in Codeanywhere

Logs in contracts are only visible in tests, or when executing contracts using stellar-cli. Logs are only compiled into the contract if the debug-assertions Rust compiler option is enabled.

tip
Logs are not a substitute for step-through debugging. Rust tests for Soroban can be step-through debugged in your Rust-enabled IDE. See testing for more details.

caution
Logs are not accessible by dapps and other applications. See the events example for how to produce structured events.

Run the Example
First go through the Setup process to get your development environment configured, then clone the v23.0.0 tag of soroban-examples repository:

git clone -b v23.0.0 https://github.com/stellar/soroban-examples

Or, skip the development environment setup and open this example in GitHub Codespaces or Code Anywhere.

To run the tests for the example, navigate to the logging directory, and use cargo test.

cd logging
cargo test -- --nocapture

You should see the output:

running 1 test
[Diagnostic Event] contract:CAAA..., topics:[log], data:["Hello {}", Dev]
[Diagnostic Event] contract:CAAA..., topics:[log], data:["Hello {}", Dev]
Writing test snapshot file for test "test::test" to "test_snapshots/test/test.1.json".
test test::test ... ok

Code
logging/Cargo.toml
[profile.release-with-logs]
inherits = "release"
debug-assertions = true

logging/src/lib.rs
#![no_std]
use soroban_sdk::{contract, contractimpl, log, Env, Symbol};

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn hello(env: Env, value: Symbol) {
        log!(&env, "Hello {}", value);
    }
}

Ref: https://github.com/stellar/soroban-examples/tree/v23.0.0/logging

How it Works
The log! macro logs a string. Any logs that occur during execution are outputted to stdout in stellar-cli and available for tests to assert on or print.

Logs are only outputted if the contract is built with the debug-assertions compiler option enabled. This makes them efficient to leave in code permanently since a regular release build will omit them.

Logs are only recorded in Soroban environments that have logging enabled. The only Soroban environments where logging is enabled is in Rust tests, and in the stellar-cli.

Open the files above to follow along.

Cargo.toml Profile
Logs are only outputted if the contract is built with the debug-assertions compiler option enabled.

The test profile that is activated when running cargo test has debug-assertions enabled, so when running tests logs are enabled by default.

A new release-with-logs profile is added to Cargo.toml that inherits from the release profile, and enables debug-assertions. It can be used to build a .wasm file that has logs enabled.

[profile.release-with-logs]
inherits = "release"
debug-assertions = true

To build without logs use the --release or --profile release option.

To build with logs use the --profile release-with-logs option.

Using the log! Macro
The log! macro builds a string from the format string, and a list of arguments. Arguments are substituted wherever the {} value appears in the format string.

log!(&env, "Hello {}", value);

The above log will render as follows if value is a Symbol containing "Dev".

Hello Symbol(Dev)

caution
The values outputted are currently relatively limited. While primitive values like u32, u64, bool, and Symbols will render clearly in the log output, Bytes, Vec, Map, and custom types will render only their handle number. Logging capabilities are in early development.

Tests
Open the logging/src/test.rs file to follow along.

logging/src/test.rs
extern crate std;

#[test]
fn test() {
    let env = Env::default();

    let addr = Address::from_str(
        &env,
        "CAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQMCJ",
    );
    let contract_id = env.register_at(&addr, Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    client.hello(&symbol_short!("Dev"));

    let logs = env.logs().all();
    assert_eq!(logs, std::vec!["[Diagnostic Event] contract:CAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQMCJ, topics:[log], data:[\"Hello {}\", Dev]"]);
    std::println!("{}", logs.join("\n"));
}


The std crate, which contains the Rust standard library, is imported so that the test can use the std::vec! and std::println! macros. Since contracts are required to use #![no_std], tests in contracts must manually import std to use std functionality like printing to stdout.

extern crate std;

In any test the first thing that is always required is an Env, which is the Soroban environment that the contract will run in.

let env = Env::default();

The contract is registered with the environment using the contract type. We're specifying precisely which contract address the contract should be deployed to in the test, using the env.register_at function. This makes it easier to ensure the logging output is coming from the relevant contract address.

let addr = Address::from_str(
    &env,
    "CAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQMCJ",
);
let contract_id = env.register_at(&addr, Contract, ());

All public functions within an impl block that is annotated with the #[contractimpl] attribute have a corresponding function generated in a generated client type. The client type will be named the same as the contract type with Client appended. For example, in our contract the contract type is HelloContract, and the client is named HelloContractClient.

let client = ContractClient::new(&env, &contract_id);
client.hello(&symbol_short!("Dev"));

Logs are available in tests via the environment.

let logs = env.logs().all();

They can be asserted on like any other value.

assert_eq!(logs, std::vec!["[Diagnostic Event] contract:CAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQMCJ, topics:[log], data:[\"Hello {}\", Dev]"]);


They can also be printed to stdout.

std::println!("{}", logs.join("\n"));

Build the Contract
To build the contract, use the stellar contract build command.

Without Logs
To build the contract without logs, use the --release option.

stellar contract build

A .wasm file should be outputted in the target directory, in the release subdirectory:

target/wasm32v1-none/release/soroban_logging_contract.wasm

With Logs
To build the contract with logs, use the --profile release-with-logs option.

stellar contract build --profile release-with-logs

A .wasm file should be outputted in the target directory, in the release-with-logs subdirectory:

target/wasm32v1-none/release-with-logs/soroban_logging_contract.wasm

Run the Contract
If you have stellar-cli installed, you can invoke contract functions in the using it. Specify the -v option to enable verbose logs.

macOS/Linux
Windows (PowerShell)
stellar -v contract invoke \
    --wasm target/wasm32v1-none/release-with-logs/soroban_logging_contract.wasm \
    --id 1 \
    -- \
    hello \
    --value friend

The output should include the following line.

📔 CAAA... - Success - Log: {"vec":[{"string":"Hello {}"},{"symbol":"friend"}]}

Auth
The auth example demonstrates how to implement authentication and authorization using the Soroban Host-managed auth framework.

This example is an extension of the storing data example.

Open in Codespaces

Open in Codeanywhere

Run the Example
First go through the Setup process to get your development environment configured, then clone the v23.0.0 tag of soroban-examples repository:

git clone -b v23.0.0 https://github.com/stellar/soroban-examples

Or, skip the development environment setup and open this example in GitHub Codespaces or Code Anywhere.

To run the tests for the example, navigate to the auth directory, and use cargo test.

cd auth
cargo test

You should see the output:

running 1 test
test test::test ... ok

Code
auth/src/lib.rs
#[contracttype]
pub enum DataKey {
    Counter(Address),
}

#[contract]
pub struct IncrementContract;

#[contractimpl]
impl IncrementContract {
    /// Increment increments a counter for the user, and returns the value.
    pub fn increment(env: Env, user: Address, value: u32) -> u32 {
        // Requires `user` to have authorized call of the `increment` of this
        // contract with all the arguments passed to `increment`, i.e. `user`
        // and `value`. This will panic if auth fails for any reason.
        // When this is called, Soroban host performs the necessary
        // authentication, manages replay prevention and enforces the user's
        // authorization policies.
        // The contracts normally shouldn't worry about these details and just
        // write code in generic fashion using `Address` and `require_auth` (or
        // `require_auth_for_args`).
        user.require_auth();

        // This call is equilvalent to the above:
        // user.require_auth_for_args((&user, value).into_val(&env));

        // The following has less arguments but is equivalent in authorization
        // scope to the above calls (the user address doesn't have to be
        // included in args as it's guaranteed to be authenticated).
        // user.require_auth_for_args((value,).into_val(&env));

        // Construct a key for the data being stored. Use an enum to set the
        // contract up well for adding other types of data to be stored.
        let key = DataKey::Counter(user.clone());

        // Get the current count for the invoker.
        let mut count: u32 = env.storage().persistent().get(&key).unwrap_or_default();

        // Increment the count.
        count += value;

        // Save the count.
        env.storage().persistent().set(&key, &count);

        // Return the count to the caller.
        count
    }
}

Ref: https://github.com/stellar/soroban-examples/tree/v23.0.0/auth

How it Works
The example contract stores a per-Address counter that can only be incremented by the owner of that Address.

Open the auth/src/lib.rs file or see the code above to follow along.

Address
#[contracttype]
pub enum DataKey {
    Counter(Address),
}

Address is a universal Soroban identifier that may represent a Stellar account, a contract, or a contract account (a contract that defines a custom authentication scheme and authorization policies). Contracts don't need to distinguish between these internal representations though. Address can be used any time some network identity needs to be represented, like to distinguish between counters for different users in this example.

Enum keys like DataKey are useful for organizing contract storage.
Different enum values create different key 'namespaces'.

In the example the counter for each address is stored against DataKey::Counter(Address). If the contract needs to start storing other types of data, it can do so by adding additional variants to the enum.

require_auth
impl IncrementContract {
    pub fn increment(env: Env, user: Address, value: u32) -> u32 {
        user.require_auth();

The require_auth method can be called for any Address. Semantically user.require_auth() here means 'require user to have authorized calling increment function of the current IncrementContract instance with the current call arguments, i.e. the current user and value argument values'. In simpler terms, this ensures that the user has allowed incrementing their counter value and nobody else can increment it.

When using require_auth the contract implementation doesn't need to worry about the signatures, authentication, and replay prevention. All these features are implemented by the Soroban host and happen automatically as long as the Address type is used.

Address has another method called require_auth_for_args. It works in the same fashion as require_auth, but allows customizing the arguments that need to be authorized. Note though, this should be used with care to ensure that there is a deterministic mapping between the contract invocation arguments and the require_auth_for_args arguments.

The following two calls are functionally equivalent to user.require_auth:

// Completely equivalent
user.require_auth_for_args((&user, value).into_val(&env));
// The following has less arguments but is equivalent in authorization
// scope to the above call (the user address doesn't have to be
// included in args as it's guaranteed to be authenticated).
user.require_auth_for_args((value,).into_val(&env));

Tests
Open the auth/src/test.rs file to follow along.

auth/src/test.rs
#![cfg(test)]
extern crate std;

#[test]
fn test() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(IncrementContract, {});
    let client = IncrementContractClient::new(&env, &contract_id);

    let user_1 = Address::generate(&env);
    let user_2 = Address::generate(&env);

    assert_eq!(client.increment(&user_1, &5), 5);
    // Verify that the user indeed had to authorize a call of `increment` with
    // the expected arguments:
    assert_eq!(
        env.auths(),
        std::vec![(
            // Address for which authorization check is performed
            user_1.clone(),
            // Invocation tree that needs to be authorized
            AuthorizedInvocation {
                // Function that is authorized. Can be a contract function or
                // a host function that requires authorization.
                function: AuthorizedFunction::Contract((
                    // Address of the called contract
                    contract_id.clone(),
                    // Name of the called function
                    symbol_short!("increment"),
                    // Arguments used to call `increment` (converted to the env-managed vector via `into_val`)
                    (user_1.clone(), 5_u32).into_val(&env),
                )),
                // The contract doesn't call any other contracts that require
                // authorization,
                sub_invocations: std::vec![]
            }
        )]
    );

    // Do more `increment` calls. It's not necessary to verify authorizations
    // for every one of them as we don't expect the auth logic to change from
    // call to call.
    assert_eq!(client.increment(&user_1, &2), 7);
    assert_eq!(client.increment(&user_2, &1), 1);
    assert_eq!(client.increment(&user_1, &3), 10);
    assert_eq!(client.increment(&user_2, &4), 5);
}

In any test the first thing that is always required is an Env, which is the Soroban environment that the contract will run in.

let env = Env::default();

The test instructs the environment to mock all auths. All calls to require_auth or require_auth_for_args will succeed.

env.mock_all_auths();

The contract is registered with the environment using the contract type.

let contract_id = env.register(IncrementContract, {});

All public functions within an impl block that is annotated with the #[contractimpl] attribute have a corresponding function generated in a generated client type. The client type will be named the same as the contract type with Client appended. For example, in our contract the contract type is IncrementContract, and the client is named IncrementContractClient.

let client = IncrementContractClient::new(&env, &contract_id);

Generate Addresses for two users. Normally the exact value of the Address shouldn't matter for testing, so they're simply generated randomly.

let user_1 = Address::random(&env);
let user_2 = Address::random(&env);

Invoke increment function for user_1.

assert_eq!(client.increment(&user_1, &5), 5);

In order to verify that the require_auth call(s) have indeed happened, use auths function that returns a vector of tuples containing the authorizations from the most recent contract invocation.

assert_eq!(
    env.auths(),
    std::vec![(
        // Address for which auth is performed
        user_1.clone(),
        // Identifier of the called contract
        contract_id.clone(),
        // Name of the called function
        symbol_short!("increment"),
        // Arguments used to call `increment` (converted to the env-managed vector via `into_val`)
        (user_1.clone(), 5_u32).into_val(&env)
    )]
);

Invoke the increment function several more times for both users. Notice, that the values are tracked separately for each users.

assert_eq!(client.increment(&user_1, &2), 7);
assert_eq!(client.increment(&user_2, &1), 1);
assert_eq!(client.increment(&user_1, &3), 10);
assert_eq!(client.increment(&user_2, &4), 5);

Build the Contract
To build the contract into a .wasm file, use the stellar contract build command.

stellar contract build

The .wasm file should be found in the target directory after building:

target/wasm32v1-none/release/soroban_auth_contract.wasm

Run the Contract
If you have stellar-cli installed, you can invoke functions on the contract.

But since we are dealing with authorization and signatures, we need to set up some identities to use for testing and get their public keys:

stellar keys generate acc1
stellar keys generate acc2
stellar keys address acc1
stellar keys address acc2

Example output with two public keys of identities:

GA6S566FD3EQDUNQ4IGSLXKW3TGVSTQW3TPHPGS7NWMCEIPBOKTNCSRU
GAJGHZ44IJXYFNOVRZGBCVKC2V62DB2KHZB7BEMYOWOLFQH4XP2TAM6B

Now the contract itself can be invoked. Notice the --source-account must be the identity name matching the address passed to the --user argument. This allows Stellar CLI to automatically sign the necessary payload for the invocation.

macOS/Linux
Windows (PowerShell)
stellar contract invoke \
    --source-account acc1 \
    --wasm target/wasm32v1-none/release/soroban_auth_contract.wasm \
    --id 1 \
    -- \
    increment \
    --user GA6S566FD3EQDUNQ4IGSLXKW3TGVSTQW3TPHPGS7NWMCEIPBOKTNCSRU \
    --value 2

Run a few more increments for both accounts.

macOS/Linux
Windows (PowerShell)
stellar contract invoke \
    --source-account acc2 \
    --wasm target/wasm32v1-none/release/soroban_auth_contract.wasm \
    --id 1 \
    -- \
    increment \
    --user GAJGHZ44IJXYFNOVRZGBCVKC2V62DB2KHZB7BEMYOWOLFQH4XP2TAM6B \
    --value 5

stellar contract invoke \
    --source-account acc1 \
    --wasm target/wasm32v1-none/release/soroban_auth_contract.wasm \
    --id 1 \
    -- \
    increment \
    --user GA6S566FD3EQDUNQ4IGSLXKW3TGVSTQW3TPHPGS7NWMCEIPBOKTNCSRU \
    --value 3

stellar contract invoke \
    --source-account acc2 \
    --wasm target/wasm32v1-none/release/soroban_auth_contract.wasm \
    --id 1 \
    -- \
    increment \
    --user GAJGHZ44IJXYFNOVRZGBCVKC2V62DB2KHZB7BEMYOWOLFQH4XP2TAM6B \
    --value 10

View the data that has been stored against each user with stellar contract read.

stellar contract read --id 1

"[""Counter"",""GA6S566FD3EQDUNQ4IGSLXKW3TGVSTQW3TPHPGS7NWMCEIPBOKTNCSRU""]",5
"[""Counter"",""GAJGHZ44IJXYFNOVRZGBCVKC2V62DB2KHZB7BEMYOWOLFQH4XP2TAM6B""]",15

It is also possible to preview the authorization payload that is being signed by providing --auth flag to the invocation:

macOS/Linux
Windows (PowerShell)
stellar contract invoke \
    --source-account acc2 \
    --auth \
    --wasm target/wasm32v1-none/release/soroban_auth_contract.wasm \
    --id 1 \
    -- \
    increment \
    --user GAJGHZ44IJXYFNOVRZGBCVKC2V62DB2KHZB7BEMYOWOLFQH4XP2TAM6B \
    --value 123

Contract auth: [{"address_with_nonce":null,"root_invocation":{"contract_id":"0000000000000000000000000000000000000000000000000000000000000001","function_name":"increment","args":[{"object":{"address":{"account":{"public_key_type_ed25519":"c7bab0288753d58d3e21cc3fa68cd2546b5f78ae6635a6f1b3fe07e03ee846e9"}}}},{"u32":123}],"sub_invocations":[]},"signature_args":[]}]


Further reading
Authorization documentation provides more details on how Soroban auth framework works.

Timelock and Single Offer examples demonstrate authorizing token operations on behalf of the user, which can be extended to any nested contract invocations.

Atomic Swap example demonstrates multi-party authorization where multiple users sign their parts of the contract invocation.

Simple Account example demonstrates a minimal contract account implementation and how __check_auth works end-to-end.
Cross Contract Calls
The cross contract call example demonstrates how to call a contract from another contract.

Open in Codespaces

Open in Codeanywhere

info
In this example there are two contracts that are compiled separately, deployed separately, and then tested together. There are a variety of ways to develop and test contracts with dependencies on other contracts, and the Soroban SDK and tooling is still building out the tools to support these workflows. Feedback appreciated here.

Run the Example
First go through the Setup process to get your development environment configured, then clone the v23.0.0 tag of soroban-examples repository:

git clone -b v23.0.0 https://github.com/stellar/soroban-examples

Or, skip the development environment setup and open this example in GitHub Codespaces or Code Anywhere.

To run the tests for the example, first build Contract A (the contract to be called) and then run cargo test from Contract B's directory. Build Contract A by navigating to the cross_contract/contract_a directory and use the stellar contract build build command:

cd cross_contract/contract_a
stellar contract build

When Contract A has been built, navigate to the cross_contract/contract_b directory, and use cargo test.

cd ../contract_b
cargo test

You should see the output:

running 1 test
test test::test ... ok

Code
cross_contract/contract_a/src/lib.rs
#[contract]
pub struct ContractA;

#[contractimpl]
impl ContractA {
    pub fn add(x: u32, y: u32) -> u32 {
        x.checked_add(y).expect("no overflow")
    }
}

cross_contract/contract_b/src/lib.rs
mod contract_a {
    soroban_sdk::contractimport!(
        file = "../contract_a/target/wasm32v1-none/release/soroban_cross_contract_a_contract.wasm"
    );
}

#[contract]
pub struct ContractB;

#[contractimpl]
impl ContractB {
    pub fn add_with(env: Env, contract: Address, x: u32, y: u32) -> u32 {
        let client = contract_a::Client::new(&env, &contract);
        client.add(&x, &y)
    }
}

Ref: https://github.com/stellar/soroban-examples/tree/v23.0.0/cross_contract

How it Works
Cross contract calls are made by invoking another contract by its contract ID.

Contracts to invoke can be imported into your contract with the use of contractimport!(file = "..."). The import will code generate:

A ContractClient type that can be used to invoke functions on the contract.
Any types in the contract that were annotated with #[contracttype].
tip
The contractimport! macro will generate the types in the module it is used, so it's a good idea to use the macro inside a mod { ... } block, or inside its own file, so that the names of generated types don't collide with names of types in your own contract.

Open the files above to follow along.

Contract A: The Contract to be Called
The contract to be called is Contract A. It is a simple contract that accepts x and y parameters, adds them together and returns the result.

cross_contract/contract_a/src/lib.rs
#[contract]
pub struct ContractA;

#[contractimpl]
impl ContractA {
    pub fn add(x: u32, y: u32) -> u32 {
        x.checked_add(y).expect("no overflow")
    }
}

tip
The contract uses the checked_add method to ensure that there is no overflow, and if there is overflow, panics rather than returning an overflowed value. Rust's primitive integer types all have checked operations available as functions with the prefix checked_.

Contract B: The Contract doing the Calling
The contract that does the calling is Contract B. It accepts a contract ID that it will call, as well as the same parameters to pass through. In many contracts the contract to call might have been stored as contract data and be retrieved, but in this simple example it is being passed in as a parameter each time.

The contract imports Contract A into the contract_a module.

The contract_a::Client is constructed pointing at the contract ID passed in.

The client is used to execute the add function with the x and y parameters on Contract A.

cross_contract/contract_b/src/lib.rs
mod contract_a {
    soroban_sdk::contractimport!(
        file = "../contract_a/target/wasm32v1-none/release/soroban_cross_contract_a_contract.wasm"
    );
}

#[contract]
pub struct ContractB;

#[contractimpl]
impl ContractB {
    pub fn add_with(env: Env, contract: Address, x: u32, y: u32) -> u32 {
        let client = contract_a::Client::new(&env, &contract);
        client.add(&x, &y)
    }
}

Tests
Open the cross_contract/contract_b/src/test.rs file to follow along.

cross_contract/contract_b/src/test.rs
#[test]
fn test() {
    let env = Env::default();

    // Register contract A using the imported WASM.
    let contract_a_id = env.register(contract_a::WASM, ());

    // Register contract B defined in this crate.
    let contract_b_id = env.register(ContractB, ());

    // Create a client for calling contract B.
    let client = ContractBClient::new(&env, &contract_b_id);

    // Invoke contract B via its client. Contract B will invoke contract A.
    let sum = client.add_with(&contract_a_id, &5, &7);
    assert_eq!(sum, 12);
}

In any test the first thing that is always required is an Env, which is the Soroban environment that the contract will run in.

let env = Env::default();

Contract A is registered with the environment using the imported Wasm.

let contract_a_id = env.register(contract_a::WASM, ());

Contract B is registered with the environment using the contract type and the contract instance is compiled into the Rust binary.

let contract_b_id = env.register(ContractB, ());

All public functions within an impl block that is annotated with the #[contractimpl] attribute have a corresponding function generated in a generated client type. The client type will be named the same as the contract type with Client appended. For example, in our contract the contract type is ContractB, and the client is named ContractBClient. The client can be constructed and used in the same way that client generated for Contract A can be.

let client = ContractBClient::new(&env, &contract_b_id);

The client is used to invoke the add_with function on Contract B. Contract B will invoke Contract A, and the result will be returned.

let sum = client.add_with(&contract_a_id, &5, &7);

The test asserts that the result that is returned is as we expect.

assert_eq!(sum, 12);

Build the Contracts
To build the contract into a .wasm file, use the stellar contract build command. Both contract_call/contract_a and contract_call/contract_b must be built, with contract_a being built first.

stellar contract build

Both .wasm files should be found in both contract target directories after building both contracts:

target/wasm32v1-none/release/soroban_cross_contract_a_contract.wasm

target/wasm32v1-none/release/soroban_cross_contract_b_contract.wasm

Run the Contract
If you have stellar-cli installed, you can invoke contract functions. Both contracts must be deployed.

macOS/Linux
Windows (PowerShell)
stellar contract deploy \
    --wasm target/wasm32v1-none/release/soroban_cross_contract_a_contract.wasm \
    --id a

stellar contract deploy \
    --wasm target/wasm32v1-none/release/soroban_cross_contract_b_contract.wasm \
    --id b

Invoke Contract B's add_with function, passing in values for x and y (e.g. as 5 and 7), and then pass in the contract ID of Contract A.

macOS/Linux
Windows (PowerShell)
stellar contract invoke \
    --id b \
    -- \
    add_with \
    --contract a \
    --x 5 \
    --y 7

The following output should occur using the code above.

12

Contract B's add_with function invoked Contract A's add function to do the addition.

Deployer
The deployer example demonstrates how to deploy contracts using a contract.

Here we deploy a contract on behalf of any address and initialize it atomically.

info
In this example there are two contracts that are compiled separately, and the tests deploy one with the other.

Open in Codespaces

Open in Codeanywhere

Run the Example
First go through the Setup process to get your development environment configured, then clone the v23.0.0 tag of soroban-examples repository:

git clone -b v23.0.0 https://github.com/stellar/soroban-examples

Or, skip the development environment setup and open this example in GitHub Codespaces or Code Anywhere.

To run the tests for the example, navigate to the deployer/deployer directory, and use cargo test.

cd deployer/deployer
cargo test

You should see the output:

running 1 test
test test::test ... ok

Code
deployer/deployer/src/lib.rs
#[contract]
pub struct Deployer;

const ADMIN: Symbol = symbol_short!("admin");

#[contractimpl]
impl Deployer {
    /// Construct the deployer with a provided administrator.
    pub fn __constructor(env: Env, admin: Address) {
        env.storage().instance().set(&ADMIN, &admin);
    }

    /// Deploys the contract on behalf of the `Deployer` contract.
    ///
    /// This has to be authorized by the `Deployer`s administrator.
    pub fn deploy(
        env: Env,
        wasm_hash: BytesN<32>,
        salt: BytesN<32>,
        constructor_args: Vec<Val>,
    ) -> Address {
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        admin.require_auth();

        // Deploy the contract using the uploaded Wasm with given hash on behalf
        // of the current contract.
        // Note, that not deploying on behalf of the admin provides more
        // consistent address space for the deployer contracts - the admin could
        // change or it could be a completely separate contract with complex
        // authorization rules, but all the contracts will still be deployed
        // by the same `Deployer` contract address.
        let deployed_address = env
            .deployer()
            .with_address(env.current_contract_address(), salt)
            .deploy_v2(wasm_hash, constructor_args);

        deployed_address
    }
}

Ref: https://github.com/stellar/soroban-examples/tree/v23.0.0/deployer

How it Works
Contracts can deploy other contracts using the SDK deployer() method.

The contract address of the deployed contract is deterministic and is derived from the address of the deployer. The deployment also has to be authorized by the deployer.

Open the deployer/deployer/src/lib.rs file to follow along.

Contract Wasm Upload
Before deploying the new contract instances, the Wasm code needs to be uploaded on-chain. Then it can be used to deploy an arbitrary number of contract instances. The upload should typically happen outside of the deployer contract, as it needs to happen just once. However, it is possible to use env.deployer().upload_contract_wasm() function to upload Wasm from a contract as well.

See the tests for an example of uploading the contract code programmatically. For the actual on-chain installation see the general deployment tutorial.

Authorization
info
For introduction to Soroban authorization see the auth tutorial.

We start with verifying authorization of the deployer contract's admin. Without that anyone would be able to call the deploy function with any arguments, which may not always be desirable (however, there are contracts where it's perfectly fine to have permissionless deployments).

let admin: Address = env.storage().instance().get(&ADMIN).unwrap();
admin.require_auth();

deployer().with_address() performs authorization as well. However, as we deploy on behalf of the current contract, the call is considered to have been implicitly authorized.

See more details on the actual authorization payloads in tests.

env.deployer()
The env.deployer() SDK function comes with a few deployment-related utilities. Here we use the most generic deployer kind, with_address(env.current_contract_address(), salt).

let deployed_address = env
    .deployer()
    .with_address(env.current_contract_address(), salt)
    .deploy_v2(wasm_hash, constructor_args);

with_address() accepts the deployer address and salt. Both are used to derive the address of the deployed contract deterministically. It is not possible to re-deploy an already existing contract.

tip
The env.deployer().with_address(env.current_contract_address(), salt) call may be replaced with the env.deployer().with_current_contract(salt) function for brevity.

The deploy_v2() function performs the actual deployment using the provided wasm_hash. The implementation of the new contract is defined by the Wasm file uploaded under wasm_hash. constructor_args are the arguments that will be passed to the constructor of the contract that is being deployed. If the deployed contract has no constructor, empty argument vector should be passed.

tip
Only the wasm_hash itself is stored per contract ID thus saving the ledger space and fees.

Tests
Open the deployer/deployer/src/test.rs file to follow along.

Contract to deploy
Start by importing the test contract Wasm to be deployed.

deployer/deployer/src/test.rs
// The contract that will be deployed by the deployer contract.
mod contract {
    soroban_sdk::contractimport!(
        file = "../contract/target/wasm32v1-none/release/soroban_deployer_test_contract.wasm"
    );
}

That contract contains the following code that exports two functions: constructor function that takes a value and a getter function for the stored value.

deployer/contract/src/lib.rs
#[contract]
pub struct Contract;

const KEY: Symbol = symbol_short!("value");

#[contractimpl]
impl Contract {
    pub fn __constructor(env: Env, value: u32) {
        env.storage().instance().set(&KEY, &value);
    }

    pub fn value(env: Env) -> u32 {
        env.storage().instance().get(&KEY).unwrap()
    }
}

Ref: https://github.com/stellar/soroban-examples/tree/v23.0.0/deployer

This test contract will be used when testing the deployer. The deployer contract will deploy the test contract and invoke its constructor.

Test code
deployer/deployer/src/test.rs
#[test]
fn test() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let deployer_client = DeployerClient::new(&env, &env.register(Deployer, (&admin,)));

    // Upload the Wasm to be deployed from the deployer contract.
    // This can also be called from within a contract if needed.
    let wasm_hash = env.deployer().upload_contract_wasm(contract::WASM);

    // Deploy contract using deployer, and include an init function to call.
    let salt = BytesN::from_array(&env, &[0; 32]);
    let constructor_args: Vec<Val> = (5u32,).into_val(&env);
    env.mock_all_auths();
    let contract_id = deployer_client.deploy(&wasm_hash, &salt, &constructor_args);

    // An authorization from the admin is required.
    let expected_auth = AuthorizedInvocation {
        // Top-level authorized function is `deploy` with all the arguments.
        function: AuthorizedFunction::Contract((
            deployer_client.address,
            symbol_short!("deploy"),
            (wasm_hash.clone(), salt, constructor_args).into_val(&env),
        )),
        sub_invocations: vec![],
    };
    assert_eq!(env.auths(), vec![(admin, expected_auth)]);

    // Invoke contract to check that it is initialized.
    let client = contract::Client::new(&env, &contract_id);
    let sum = client.value();
    assert_eq!(sum, 5);
}

In any test the first thing that is always required is an Env, which is the Soroban environment that the contract will run in.

let env = Env::default();

Register the deployer contract with the environment and create a client to for it. The contract is initialized with the admin address during the registration.

let admin = Address::generate(&env);
let deployer_client = DeployerClient::new(&env, &env.register(Deployer, (&admin,)));

Upload the code of the test contract that we have imported above via contractimport! and get the hash of the uploaded Wasm code.

let wasm_hash = env.deployer().upload_contract_wasm(contract::WASM);

The client is used to invoke the deploy function. The contract will deploy the test contract using the hash of its Wasm code and pass a single 5u32 argument to its constructor. We also need the salt to pass into the call in order to generate a unique identifier of the output contract.

let salt = BytesN::from_array(&env, &[0; 32]);
let constructor_args: Vec<Val> = (5u32,).into_val(&env);

Before invoking the contract we need to enable mock authorization in order to get the recorded authorization payload that we can verify.

env.mock_all_auths();

After the preparations above we can actually call the deploy function.

let contract_id = deployer_client.deploy(&wasm_hash, &salt, &constructor_args);

The deployment requires authorization from the admin. As mentioned above, the authorization necessary for deploy_v2 function is performed on behalf of the deployer contract and is implicit. This can be verified in the test by examining env.auths().

// An authorization from the admin is required.
let expected_auth = AuthorizedInvocation {
    // Top-level authorized function is `deploy` with all the arguments.
    function: AuthorizedFunction::Contract((
        deployer_client.address,
        symbol_short!("deploy"),
        (wasm_hash.clone(), salt, constructor_args).into_val(&env),
    )),
    sub_invocations: vec![],
};
assert_eq!(env.auths(), vec![(admin, expected_auth)]);

The test checks that the test contract was deployed by using its client to invoke it and get back the value set during initialization.

// Invoke contract to check that it is initialized.
let client = contract::Client::new(&env, &contract_id);
let sum = client.value();
assert_eq!(sum, 5);

Build the Contracts
To build the contract into a .wasm file, use the stellar contract build command. Build both the deployer contract and the test contract.

stellar contract build

Both .wasm files should be found in both contract target directories after building both contracts:

target/wasm32v1-none/release/soroban_deployer_contract.wasm

target/wasm32v1-none/release/soroban_deployer_test_contract.wasm

Run the Contract
If you have stellar-cli installed, you can invoke the contract function to deploy the test contract.

Before deploying the test contract with the deployer, install the test contract Wasm using the install command. The install command will print out the hash derived from the Wasm file (it's not just the hash of the Wasm file itself though) which should be used by the deployer.

stellar contract upload --wasm contract/target/wasm32v1-none/release/soroban_deployer_test_contract.wasm

The command prints out the hash as hex. It will look something like 7792a624b562b3d9414792f5fb5d72f53b9838fef2ed9a901471253970bc3b15.

We also need to deploy the Deployer contract:

stellar contract deploy --wasm deployer/target/wasm32v1-none/release/soroban_deployer_contract.wasm --alias 1

This will return the deployer address: CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM.

Then the deployer contract may be invoked with the Wasm hash value above.

macOS/Linux
Windows (PowerShell)
stellar contract invoke --id 1 -- deploy \
    --deployer CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM
    --salt 123 \
    --wasm_hash 7792a624b562b3d9414792f5fb5d72f53b9838fef2ed9a901471253970bc3b15 \
    --constructor_args '[{"u32":5}]'

And then invoke the deployed test contract using the identifier returned from the previous command.

macOS/Linux
Windows (PowerShell)
stellar contract invoke \
    --id ead19f55aec09bfcb555e09f230149ba7f72744a5fd639804ce1e934e8fe9c5d \
    -- \
    value

The following output should occur using the code above.

5

Allocator
The allocator example demonstrates how to utilize the allocator feature when writing a contract.

Open in Codespaces

Open in Codeanywhere

The soroban-sdk crate provides a lightweight bump-pointer allocator which can be used to emulate heap memory allocation in a Wasm smart contract.

Run the Example
First go through the Setup process to get your development environment configured, then clone the v23.0.0 tag of soroban-examples repository:

git clone -b v23.0.0 https://github.com/stellar/soroban-examples

Or, skip the development environment setup and open this example in GitHub Codespaces or Code Anywhere.

To run the tests for the example, navigate to the alloc directory, and use cargo test.

cd alloc
cargo test

You should see the output:

running 1 test
test test::test ... ok

Dependencies
This example depends on the alloc feature in soroban-sdk. To include it, add "alloc" to the "features" list of soroban-sdk in the Cargo.toml file:

alloc/Cargo.toml
[dependencies]
soroban-sdk = { version = "23.0.1", features = ["alloc"] }

[dev_dependencies]
soroban-sdk = { version = "23.0.1", features = ["testutils", "alloc"] }

Code
alloc/src/lib.rs
#![no_std]
use soroban_sdk::{contract, contractimpl, Env};

extern crate alloc;

#[contract]
pub struct AllocContract;

#[contractimpl]
impl AllocContract {
    /// Allocates a temporary vector holding values (0..count), then computes and returns their sum.
    pub fn sum(_env: Env, count: u32) -> u32 {
        let mut v1 = alloc::vec![];
        (0..count).for_each(|i| v1.push(i));

        let mut sum = 0;
        for i in v1 {
            sum += i;
        }

        sum
    }
}

Ref: https://github.com/stellar/soroban-examples/tree/v23.0.0/alloc

How it Works
extern crate alloc;

Imports the alloc crate, which is required in order to support allocation under no_std. See Contract Rust dialect for more info about no_std.

let mut v1 = alloc::vec![];

Creates a contiguous growable array v1 with contents allocated on the heap memory.

info
The heap memory in the context of a smart contract actually refers to the Wasm linear memory. The alloc will use the global allocator provided by the soroban sdk to interact with the linear memory.

caution
Using heap allocated array is typically slow and computationally expensive. Try to avoid it and instead use a fixed-sized array or soroban_sdk::vec! whenever possible.

This is especially the case for a large-size array. Whenever the array size grows beyond the current linear memory size, which is multiple of the page size (64KB), the wasm32::memory_grow is invoked to grow the linear memory by more pages as necessary, which is very computationally expensive.

The remaining code pushes values (0..count) to v1, then computes and returns their sum. This is the simplest example to illustrate how to use the allocator.
Atomic Swap
The atomic swap example swaps two tokens between two authorized parties atomically while following the limits they set.

This is example demonstrates advanced usage of Soroban auth framework and assumes the reader is familiar with the auth example and with Soroban token usage.

Open in Codespaces

Open in Codeanywhere

Run the Example
First go through the Setup process to get your development environment configured, then clone the v23.0.0 tag of soroban-examples repository:

git clone -b v23.0.0 https://github.com/stellar/soroban-examples

Or, skip the development environment setup and open this example in GitHub Codespaces or Code Anywhere.

To run the tests for the example use cargo test.

cargo test -p soroban-atomic-swap-contract

You should see the output:

running 1 test
test test::test_atomic_swap ... ok

Code
atomic_swap/src/lib.rs
#[contract]
pub struct AtomicSwapContract;

#[contractimpl]
impl AtomicSwapContract {
    // Swap token A for token B atomically. Settle for the minimum requested price
    // for each party (this is an arbitrary choice; both parties could have
    // received the full amount as well).
    pub fn swap(
        env: Env,
        a: Address,
        b: Address,
        token_a: Address,
        token_b: Address,
        amount_a: i128,
        min_b_for_a: i128,
        amount_b: i128,
        min_a_for_b: i128,
    ) {
        // Verify preconditions on the minimum price for both parties.
        if amount_b < min_b_for_a {
            panic!("not enough token B for token A");
        }
        if amount_a < min_a_for_b {
            panic!("not enough token A for token B");
        }
        // Require authorization for a subset of arguments specific to a party.
        // Notice, that arguments are symmetric - there is no difference between
        // `a` and `b` in the call and hence their signatures can be used
        // either for `a` or for `b` role.
        a.require_auth_for_args(
            (token_a.clone(), token_b.clone(), amount_a, min_b_for_a).into_val(&env),
        );
        b.require_auth_for_args(
            (token_b.clone(), token_a.clone(), amount_b, min_a_for_b).into_val(&env),
        );

        // Perform the swap by moving tokens from a to b and from b to a.
        move_token(&env, &token_a, &a, &b, amount_a, min_a_for_b);
        move_token(&env, &token_b, &b, &a, amount_b, min_b_for_a);
    }
}

fn move_token(
    env: &Env,
    token: &Address,
    from: &Address,
    to: &Address,
    max_spend_amount: i128,
    transfer_amount: i128,
) {
    let token = token::Client::new(env, token);
    let contract_address = env.current_contract_address();
    // This call needs to be authorized by `from` address. It transfers the
    // maximum spend amount to the swap contract's address in order to decouple
    // the signature from `to` address (so that parties don't need to know each
    // other).
    token.transfer(from, &contract_address, &max_spend_amount);
    // Transfer the necessary amount to `to`.
    token.transfer(&contract_address, to, &transfer_amount);
    // Refund the remaining balance to `from`.
    token.transfer(
        &contract_address,
        from,
        &(max_spend_amount - transfer_amount),
    );
}

Ref: https://github.com/stellar/soroban-examples/tree/v23.0.0/atomic_swap

How it Works
The example contract requires two Address-es to authorize their parts of the swap operation: one Address wants to sell a given amount of token A for token B at a given price and another Address wants to sell token B for token A at a given price. The contract swaps the tokens atomically, but only if the requested minimum price is respected for both parties.

Open the atomic_swap/src/lib.rs file or see the code above to follow along.

Swap authorization
...
a.require_auth_for_args(
    (token_a.clone(), token_b.clone(), amount_a, min_b_for_a).into_val(&env),
);
b.require_auth_for_args(
    (token_b.clone(), token_a.clone(), amount_b, min_a_for_b).into_val(&env),
);
...

Authorization of swap function leverages require_auth_for_args Soroban host function. Both a and b need to authorize symmetric arguments: token they sell, token they buy, amount of token they sell, minimum amount of token they want to receive. This means that a and b can be freely exchanged in the invocation arguments (as long as the respective arguments are changed too).

Moving the tokens
...
// Perform the swap via two token transfers.
move_token(&env, token_a, &a, &b, amount_a, min_a_for_b);
move_token(&env, token_b, &b, &a, amount_b, min_b_for_a);
...
fn move_token(
    env: &Env,
    token: &Address,
    from: &Address,
    to: &Address,
    max_spend_amount: i128,
    transfer_amount: i128,
) {
    let token = token::Client::new(env, token);
    let contract_address = env.current_contract_address();
    // This call needs to be authorized by `from` address. It transfers the
    // maximum spend amount to the swap contract's address in order to decouple
    // the signature from `to` address (so that parties don't need to know each
    // other).
    token.transfer(from, &contract_address, &max_spend_amount);
    // Transfer the necessary amount to `to`.
    token.transfer(&contract_address, to, &transfer_amount);
    // Refund the remaining balance to `from`.
    token.transfer(
        &contract_address,
        from,
        &(&max_spend_amount - &transfer_amount),
    );
}

The swap itself is implemented via two token moves: from a to b and from b to a. The token move is implemented via allowance: the users don't need to know each other in order to perform the swap, and instead they authorize the swap contract to spend the necessary amount of token on their behalf via transfer. Soroban auth framework makes sure that the transfer signatures would have the proper context, and they won't be usable outside the swap contract invocation.

Tests
Open the atomic_swap/src/test.rs file to follow along.

Refer to another examples for the general information on the test setup.

The interesting part for this example is verification of swap authorization:

contract.swap(
    &a,
    &b,
    &token_a.address,
    &token_b.address,
    &1000,
    &4500,
    &5000,
    &950,
);

assert_eq!(
    env.auths(),
    std::vec![
        (
            a.clone(),
            AuthorizedInvocation {
                function: AuthorizedFunction::Contract((
                    contract.address.clone(),
                    symbol_short!("swap"),
                    (
                        token_a.address.clone(),
                        token_b.address.clone(),
                        1000_i128,
                        4500_i128
                    )
                        .into_val(&env),
                )),
                sub_invocations: std::vec![AuthorizedInvocation {
                    function: AuthorizedFunction::Contract((
                        token_a.address.clone(),
                        symbol_short!("transfer"),
                        (a.clone(), contract.address.clone(), 1000_i128,).into_val(&env),
                    )),
                    sub_invocations: std::vec![]
                }]
            }
        ),
        (
            b.clone(),
            AuthorizedInvocation {
                function: AuthorizedFunction::Contract((
                    contract.address.clone(),
                    symbol_short!("swap"),
                    (
                        token_b.address.clone(),
                        token_a.address.clone(),
                        5000_i128,
                        950_i128
                    )
                        .into_val(&env),
                )),
                sub_invocations: std::vec![AuthorizedInvocation {
                    function: AuthorizedFunction::Contract((
                        token_b.address.clone(),
                        symbol_short!("transfer"),
                        (b.clone(), contract.address.clone(), 5000_i128,).into_val(&env),
                    )),
                    sub_invocations: std::vec![]
                }]
            }
        ),
    ]
);

env.auths() returns all the authorizations. In the case of swap four authorizations are expected. Two for each address authorizing, because each address authorizes not only the swap, but the approve all on the token being sent.

Liquidity Pool
The liquidity pool example demonstrates how to write a constant product liquidity pool contract. A liquidity pool is an automated way to add liquidity for a set of tokens that will facilitate asset conversion between them. Users can deposit some amount of each token into the pool, receiving a proportional number of "token shares." The user will then receive a portion of the accrued conversion fees when they ultimately "trade in" their token shares to receive their original tokens back.

Soroban liquidity pools are exclusive to Soroban and cannot interact with built-in Stellar AMM liquidity pools.

caution
Implementing a liquidity pool contract should be done cautiously. User funds are involved, so great care should be taken to ensure safety and transparency. The example here should not be considered a ready-to-go contract. Please use it as a reference only.

The Stellar network already has liquidity pool functionality built right in to the core protocol. Learn more here.

Open in Codespaces

Open in Codeanywhere

Run the Example
First go through the Setup process to get your development environment configured, then clone the v23.0.0 tag of soroban-examples repository:

git clone -b v23.0.0 https://github.com/stellar/soroban-examples

Or, skip the development environment setup and open this example in GitHub Codespaces or Code Anywhere.

To run the tests for the example, navigate to the liquidity_pool directory, and use cargo test.

cd liquidity_pool
cargo test

You should see the output:

running 3 tests
test test::deposit_amount_zero_should_panic - should panic ... ok
test test::swap_reserve_one_nonzero_other_zero - should panic ... ok
test test::test ... ok

Code
liquidity_pool/src/lib.rs
#![no_std]

mod test;

use num_integer::Roots;
use soroban_sdk::{contract, contractimpl, contractmeta, contracttype, token, Address, Env};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    TokenA,
    TokenB,
    TotalShares,
    ReserveA,
    ReserveB,
    Shares(Address),
}

fn get_token_a(e: &Env) -> Address {
    e.storage().instance().get(&DataKey::TokenA).unwrap()
}

fn get_token_b(e: &Env) -> Address {
    e.storage().instance().get(&DataKey::TokenB).unwrap()
}

fn get_total_shares(e: &Env) -> i128 {
    e.storage().instance().get(&DataKey::TotalShares).unwrap()
}

fn get_reserve_a(e: &Env) -> i128 {
    e.storage().instance().get(&DataKey::ReserveA).unwrap()
}

fn get_reserve_b(e: &Env) -> i128 {
    e.storage().instance().get(&DataKey::ReserveB).unwrap()
}

fn get_balance(e: &Env, contract: Address) -> i128 {
    token::Client::new(e, &contract).balance(&e.current_contract_address())
}

fn get_balance_a(e: &Env) -> i128 {
    get_balance(e, get_token_a(e))
}

fn get_balance_b(e: &Env) -> i128 {
    get_balance(e, get_token_b(e))
}

fn get_shares(e: &Env, user: &Address) -> i128 {
    e.storage()
        .persistent()
        .get(&DataKey::Shares(user.clone()))
        .unwrap_or(0)
}

fn put_shares(e: &Env, user: &Address, amount: i128) {
    e.storage()
        .persistent()
        .set(&DataKey::Shares(user.clone()), &amount);
}

fn put_token_a(e: &Env, contract: Address) {
    e.storage().instance().set(&DataKey::TokenA, &contract);
}

fn put_token_b(e: &Env, contract: Address) {
    e.storage().instance().set(&DataKey::TokenB, &contract);
}

fn put_total_shares(e: &Env, amount: i128) {
    e.storage().instance().set(&DataKey::TotalShares, &amount)
}

fn put_reserve_a(e: &Env, amount: i128) {
    e.storage().instance().set(&DataKey::ReserveA, &amount)
}

fn put_reserve_b(e: &Env, amount: i128) {
    e.storage().instance().set(&DataKey::ReserveB, &amount)
}

fn burn_shares(e: &Env, from: &Address, amount: i128) {
    let current_shares = get_shares(e, from);
    if current_shares < amount {
        panic!("insufficient shares");
    }
    let total = get_total_shares(e);
    put_shares(e, from, current_shares - amount);
    put_total_shares(e, total - amount);
}

fn mint_shares(e: &Env, to: &Address, amount: i128) {
    let current_shares = get_shares(e, to);
    let total = get_total_shares(e);
    put_shares(e, to, current_shares + amount);
    put_total_shares(e, total + amount);
}

fn transfer(e: &Env, token: Address, to: Address, amount: i128) {
    token::Client::new(e, &token).transfer(&e.current_contract_address(), &to, &amount);
}

fn transfer_a(e: &Env, to: Address, amount: i128) {
    transfer(e, get_token_a(e), to, amount);
}

fn transfer_b(e: &Env, to: Address, amount: i128) {
    transfer(e, get_token_b(e), to, amount);
}

fn get_deposit_amounts(
    desired_a: i128,
    min_a: i128,
    desired_b: i128,
    min_b: i128,
    reserve_a: i128,
    reserve_b: i128,
) -> (i128, i128) {
    if reserve_a == 0 && reserve_b == 0 {
        return (desired_a, desired_b);
    }

    let amount_b = desired_a * reserve_b / reserve_a;
    if amount_b <= desired_b {
        if amount_b < min_b {
            panic!("amount_b less than min")
        }
        (desired_a, amount_b)
    } else {
        let amount_a = desired_b * reserve_a / reserve_b;
        if amount_a > desired_a || amount_a < min_a {
            panic!("amount_a invalid")
        }
        (amount_a, desired_b)
    }
}

// Metadata that is added on to the WASM custom section
contractmeta!(
    key = "Description",
    val = "Constant product AMM with a .3% swap fee"
);

#[contract]
struct LiquidityPool;

#[contractimpl]
impl LiquidityPool {
    pub fn __constructor(e: Env, token_a: Address, token_b: Address) {
        if token_a >= token_b {
            panic!("token_a must be less than token_b");
        }

        put_token_a(&e, token_a);
        put_token_b(&e, token_b);
        put_total_shares(&e, 0);
        put_reserve_a(&e, 0);
        put_reserve_b(&e, 0);
    }

    pub fn balance_shares(e: Env, user: Address) -> i128 {
        get_shares(&e, &user)
    }

    pub fn deposit(
        e: Env,
        to: Address,
        desired_a: i128,
        min_a: i128,
        desired_b: i128,
        min_b: i128,
    ) {
        // Depositor needs to authorize the deposit
        to.require_auth();

        let (reserve_a, reserve_b) = (get_reserve_a(&e), get_reserve_b(&e));

        // Calculate deposit amounts
        let (amount_a, amount_b) =
            get_deposit_amounts(desired_a, min_a, desired_b, min_b, reserve_a, reserve_b);

        if amount_a <= 0 || amount_b <= 0 {
            // If one of the amounts can be zero, we can get into a situation
            // where one of the reserves is 0, which leads to a divide by zero.
            panic!("both amounts must be strictly positive");
        }

        let token_a_client = token::Client::new(&e, &get_token_a(&e));
        let token_b_client = token::Client::new(&e, &get_token_b(&e));

        token_a_client.transfer(&to, &e.current_contract_address(), &amount_a);
        token_b_client.transfer(&to, &e.current_contract_address(), &amount_b);

        // Now calculate how many new pool shares to mint
        let (balance_a, balance_b) = (get_balance_a(&e), get_balance_b(&e));
        let total_shares = get_total_shares(&e);

        let zero = 0;
        let new_total_shares = if reserve_a > zero && reserve_b > zero {
            let shares_a = (balance_a * total_shares) / reserve_a;
            let shares_b = (balance_b * total_shares) / reserve_b;
            shares_a.min(shares_b)
        } else {
            (balance_a * balance_b).sqrt()
        };

        mint_shares(&e, &to, new_total_shares - total_shares);
        put_reserve_a(&e, balance_a);
        put_reserve_b(&e, balance_b);
    }

    // If "buy_a" is true, the swap will buy token_a and sell token_b. This is flipped if "buy_a" is false.
    // "out" is the amount being bought, with in_max being a safety to make sure you receive at least that amount.
    // swap will transfer the selling token "to" to this contract, and then the contract will transfer the buying token to "to".
    pub fn swap(e: Env, to: Address, buy_a: bool, out: i128, in_max: i128) {
        to.require_auth();

        let (reserve_a, reserve_b) = (get_reserve_a(&e), get_reserve_b(&e));
        let (reserve_sell, reserve_buy) = if buy_a {
            (reserve_b, reserve_a)
        } else {
            (reserve_a, reserve_b)
        };

        if reserve_buy < out {
            panic!("not enough token to buy");
        }

        // First calculate how much needs to be sold to buy amount out from the pool
        let n = reserve_sell * out * 1000;
        let d = (reserve_buy - out) * 997;
        let sell_amount = (n / d) + 1;
        if sell_amount > in_max {
            panic!("in amount is over max")
        }

        // Transfer the amount being sold to the contract
        let sell_token = if buy_a {
            get_token_b(&e)
        } else {
            get_token_a(&e)
        };
        let sell_token_client = token::Client::new(&e, &sell_token);
        sell_token_client.transfer(&to, &e.current_contract_address(), &sell_amount);

        let (balance_a, balance_b) = (get_balance_a(&e), get_balance_b(&e));

        // residue_numerator and residue_denominator are the amount that the invariant considers after
        // deducting the fee, scaled up by 1000 to avoid fractions
        let residue_numerator = 997;
        let residue_denominator = 1000;
        let zero = 0;

        let new_invariant_factor = |balance: i128, reserve: i128, out: i128| {
            let delta = balance - reserve - out;
            let adj_delta = if delta > zero {
                residue_numerator * delta
            } else {
                residue_denominator * delta
            };
            residue_denominator * reserve + adj_delta
        };

        let (out_a, out_b) = if buy_a { (out, 0) } else { (0, out) };

        let new_inv_a = new_invariant_factor(balance_a, reserve_a, out_a);
        let new_inv_b = new_invariant_factor(balance_b, reserve_b, out_b);
        let old_inv_a = residue_denominator * reserve_a;
        let old_inv_b = residue_denominator * reserve_b;

        if new_inv_a * new_inv_b < old_inv_a * old_inv_b {
            panic!("constant product invariant does not hold");
        }

        if buy_a {
            transfer_a(&e, to, out_a);
        } else {
            transfer_b(&e, to, out_b);
        }

        let new_reserve_a = balance_a - out_a;
        let new_reserve_b = balance_b - out_b;

        if new_reserve_a <= 0 || new_reserve_b <= 0 {
            panic!("new reserves must be strictly positive");
        }

        put_reserve_a(&e, new_reserve_a);
        put_reserve_b(&e, new_reserve_b);
    }

    // transfers share_amount of pool share tokens to this contract, burns all pools share tokens in this contracts, and sends the
    // corresponding amount of token_a and token_b to "to".
    // Returns amount of both tokens withdrawn
    pub fn withdraw(
        e: Env,
        to: Address,
        share_amount: i128,
        min_a: i128,
        min_b: i128,
    ) -> (i128, i128) {
        to.require_auth();

        let current_shares = get_shares(&e, &to);
        if current_shares < share_amount {
            panic!("insufficient shares");
        }

        let (balance_a, balance_b) = (get_balance_a(&e), get_balance_b(&e));
        let total_shares = get_total_shares(&e);

        // Calculate withdrawal amounts
        let out_a = (balance_a * share_amount) / total_shares;
        let out_b = (balance_b * share_amount) / total_shares;

        if out_a < min_a || out_b < min_b {
            panic!("min not satisfied");
        }

        burn_shares(&e, &to, share_amount);
        transfer_a(&e, to.clone(), out_a);
        transfer_b(&e, to, out_b);
        put_reserve_a(&e, balance_a - out_a);
        put_reserve_b(&e, balance_b - out_b);

        (out_a, out_b)
    }

    pub fn get_rsrvs(e: Env) -> (i128, i128) {
        (get_reserve_a(&e), get_reserve_b(&e))
    }
}


Ref: https://github.com/stellar/soroban-examples/tree/v23.0.0/liquidity_pool

How it Works
Every asset created on Stellar starts with zero liquidity. The same is true of tokens created on Soroban (unless a Stellar asset with existing liquidity token has its Stellar Asset Contract (SAC) deployed for use in Soroban). In simple terms, "liquidity" means how much of an asset in a market is available to be bough or sold. In the "old days," you could generate liquidity in a market by creating buy/sell orders on an order book.

Liquidity pools automate this process by substituting the orders with math. Depositors into the liquidity pool earn fees from swap transactions. No orders required!

Open the liquidity_pool/src/lib.rs file or see the code above to follow along.

Initialize the Contract
When this contract is deployed, the __constructor function will automatically and atomically be invoked, so the following arguments must be passed in:

token_a: The contract Address for an already deployed (or wrapped) token that will be held in reserve by the liquidity pool.
token_b: The contract Address for an already deployed (or wrapped) token that will be held in reserve by the liquidity pool.
Bear in mind that which token is token_a and which is token_b is not an arbitrary distinction. In line with the Built-in Stellar liquidity pools, this contract can only make a single liquidity pool for a given set of tokens. So, the token addresses must be provided in lexicographical order at the time of initialization.

liquidity_pool/src/lib.rs
pub fn __constructor(e: Env, token_a: Address, token_b: Address) {
    if token_a >= token_b {
        panic!("token_a must be less than token_b");
    }

    put_token_a(&e, token_a);
    put_token_b(&e, token_b);
    put_total_shares(&e, 0);
    put_reserve_a(&e, 0);
    put_reserve_b(&e, 0);
}

A "Constant Product" Liquidity Pool
The type of liquidity pool this example contract implements is called a "constant product" liquidity pool. While this isn't the only type of liquidity pool out there, it is the most common variety. These liquidity pools are designed to keep the total value of each asset in relative equilibrium. The "product" in the constant product (also called an "invariant") will change every time the liquidity pool is interacted with (deposit, withdraw, or token swaps). However, the invariant must only increase with every interaction.

During a swap, what must be kept in mind is that for every withdrawal from the token_a side, you must "refill" the token_b side with a sufficient amount to keep the liquidity pool's price balanced. The math is predictable, but it is not linear. The more you take from one side, the more you must give on the opposite site exponentially.

Inside the swap function, the math is done like this (this is a simplified version, however):

liquidity_pool/src/lib.rs
pub fn swap(e: Env, to: Address, buy_a: bool, out: i128, in_max: i128) {
    // Get the current balances of both tokens in the liquidity pool
    let (reserve_sell, reserve_buy) = (get_reserve_a(&e), get_reserve_b(&e));

    // Calculate how much needs to be
    let n = reserve_sell * out * 1000;
    let d = (reserve_buy - out) * 997;
    let sell_amount = (n / d) + 1;
}

We have much more in-depth information about how this kind of liquidity pool works is available in Stellar Quest: Series 3, Quest 5. This is a really useful, interactive way to learn more about how the built-in Stellar liquidity pools work. Much of the knowledge you might gain from there will easily translate to this example contract.

Interacting with Token Contracts in Another Contract
This liquidity pool contract will operate with a total of three different Soroban tokens:

Pool Shares: This example uses a very simple share token given to asset depositors in exchange for their deposit. These tokens are "traded in" by the user when they withdraw some amount of their original deposit (plus any earned swap fees). In this simplified system, shares are just added/subtracted whenever a user deposits or withdraws the underlying assets. No distinct token contract will be used for these shares.
token_a and token_b: Will be the two "reserve tokens" that users will deposit into the pool. These could be "wrapped" tokens from pre-existing Stellar assets, or they could be Soroban-native tokens. This contract doesn't really care, as long as the functions it needs from the common Token Interface are available in the token contract.
Minting and Burning LP Shares
We are minting and burning LP shares within the logic of the main contract, instead of utilizing a distinct token contract. There are some "helper" functions created to facilitate this functionality. These functions are used when a user takes any kind of deposit or withdraw action.

liquidity_pool/src/lib.rs
fn burn_shares(e: &Env, from: &Address, amount: i128) {
    let current_shares = get_shares(e, from);
    if current_shares < amount {
        panic!("insufficient shares");
    }
    let total = get_total_shares(e);
    put_shares(e, from, current_shares - amount);
    put_total_shares(e, total - amount);
}

fn mint_shares(e: &Env, to: &Address, amount: i128) {
    let current_shares = get_shares(e, to);
    let total = get_total_shares(e);
    put_shares(e, to, current_shares + amount);
    put_total_shares(e, total + amount);
}

How is that number of shares calculated, you ask? Excellent question! If it's the very first deposit (see above), it's just the square root of the product of the quantities of token_a and token_b deposited. Very simple.

However, if there have already been deposits into the liquidity pool, and the user is just adding more tokens into the pool, there's a bit more math. However, the main point is that each depositor receives the same ratio of POOL tokens for their deposit as every other depositor.

fn deposit(e: Env, to: Address, desired_a: i128, min_a: i128, desired_b: i128, min_b: i128) {
    let zero = 0;
    let new_total_shares = if reserve_a > zero && reserve_b > zero {
        // Note balance_a and balance_b at this point in the function include
        // the tokens the user is currently depositing, whereas reserve_a and
        // reserve_b do not yet.
        let shares_a = (balance_a * total_shares) / reserve_a;
        let shares_b = (balance_b * total_shares) / reserve_b;
        shares_a.min(shares_b)
    } else {
        (balance_a * balance_b).sqrt()
    };
}

Token Transfers to/from the LP Contract
As we've already discussed, the liquidity pool contract will make use of the Token Interface available in the token contracts that were supplied as token_a and token_b arguments at the time of initialization. Throughout the rest of the contract, the liquidity pool will make use of that interface to make transfers of those tokens to/from itself.

What's happening is that as a user deposits tokens into the pool, and the contract invokes the transfer function to move the tokens from the to address (the depositor) to be held by the contract address. POOL tokens are then minted to depositor (see previous section). Pretty simple, right!?

liquidity_pool/src/lib.rs
fn deposit(e: Env, to: Address, desired_a: i128, min_a: i128, desired_b: i128, min_b: i128) {
    // Depositor needs to authorize the deposit
    to.require_auth();

    let token_a_client = token::Client::new(&e, &get_token_a(&e));
    let token_b_client = token::Client::new(&e, &get_token_b(&e));

    token_a_client.transfer(&to, &e.current_contract_address(), &amount_a);
    token_b_client.transfer(&to, &e.current_contract_address(), &amount_b);

    mint_shares(&e, to, new_total_shares - total_shares);
}

In contrast, when a user withdraws their deposited tokens, it's a bit more involved, and the following procedure happens.

The number of shares being "redeemed" by the user are checked against the actual amount of shares the user holds.
The withdraw amounts for the reserve tokens are calculated based on the amount of share tokens being redeemed.
The share tokens are burned now the withdraw amounts have been calculated, and they are no longer needed.
The respective amounts of token_a and token_b are transferred from the contract address into the to address (the depositor).
liquidity_pool/src/lib.rs
fn withdraw(e: Env, to: Address, share_amount: i128, min_a: i128, min_b: i128) -> (i128, i128) {
    to.require_auth();

    // First calculate the specified pool shares are available to the user
    let current_shares = get_shares(&e, &to);
    if current_shares < share_amount {
        panic!("insufficient shares");
    }

    // ... balances of pool shares and underlying assets are retrieved

    // Now calculate the withdraw amounts
    let out_a = (balance_a * balance_shares) / total_shares;
    let out_b = (balance_b * balance_shares) / total_shares;

    burn_shares(&e, balance_shares);
    transfer_a(&e, to.clone(), out_a);
    transfer_b(&e, to, out_b);
}

You'll notice that by holding the balance of token_a and token_b on the liquidity pool contract itself it makes, it very easy for us to perform any of the Token Interface actions inside the contract. As a bonus, any outside observer could query the balances of token_a or token_b held by the contract to verify the reserves are actually in line with the values the contract reports when its own get_rsvs function is invoked.

Tests
Open the liquidity_pool/src/test.rs file to follow along.

liquidity_pool/src/test.rs
#![cfg(test)]
extern crate std;

use crate::LiquidityPoolClient;

use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, AuthorizedFunction, AuthorizedInvocation},
    token, Address, Env, IntoVal,
};

fn create_token_contract<'a>(
    e: &Env,
    admin: &Address,
) -> (token::Client<'a>, token::StellarAssetClient<'a>) {
    let sac = e.register_stellar_asset_contract_v2(admin.clone());
    (
        token::Client::new(e, &sac.address()),
        token::StellarAssetClient::new(e, &sac.address()),
    )
}

fn create_liqpool_contract<'a>(
    e: &Env,
    token_a: &Address,
    token_b: &Address,
) -> LiquidityPoolClient<'a> {
    LiquidityPoolClient::new(e, &e.register(crate::LiquidityPool {}, (token_a, token_b)))
}

#[test]
fn test() {
    let e = Env::default();
    e.mock_all_auths();

    let admin1 = Address::generate(&e);
    let admin2 = Address::generate(&e);

    let (token1, token1_admin) = create_token_contract(&e, &admin1);
    let (token2, token2_admin) = create_token_contract(&e, &admin2);
    let user1 = Address::generate(&e);

    let liqpool = create_liqpool_contract(&e, &token1.address, &token2.address);

    token1_admin.mint(&user1, &1000);
    assert_eq!(token1.balance(&user1), 1000);

    token2_admin.mint(&user1, &1000);
    assert_eq!(token2.balance(&user1), 1000);

    liqpool.deposit(&user1, &100, &100, &100, &100);
    assert_eq!(
        e.auths(),
        std::vec![(
            user1.clone(),
            AuthorizedInvocation {
                function: AuthorizedFunction::Contract((
                    liqpool.address.clone(),
                    symbol_short!("deposit"),
                    (&user1, 100_i128, 100_i128, 100_i128, 100_i128).into_val(&e)
                )),
                sub_invocations: std::vec![
                    AuthorizedInvocation {
                        function: AuthorizedFunction::Contract((
                            token1.address.clone(),
                            symbol_short!("transfer"),
                            (&user1, &liqpool.address, 100_i128).into_val(&e)
                        )),
                        sub_invocations: std::vec![]
                    },
                    AuthorizedInvocation {
                        function: AuthorizedFunction::Contract((
                            token2.address.clone(),
                            symbol_short!("transfer"),
                            (&user1, &liqpool.address, 100_i128).into_val(&e)
                        )),
                        sub_invocations: std::vec![]
                    }
                ]
            }
        )]
    );

    assert_eq!(liqpool.balance_shares(&user1), 100);
    assert_eq!(token1.balance(&user1), 900);
    assert_eq!(token1.balance(&liqpool.address), 100);
    assert_eq!(token2.balance(&user1), 900);
    assert_eq!(token2.balance(&liqpool.address), 100);

    liqpool.swap(&user1, &false, &49, &100);
    assert_eq!(
        e.auths(),
        std::vec![(
            user1.clone(),
            AuthorizedInvocation {
                function: AuthorizedFunction::Contract((
                    liqpool.address.clone(),
                    symbol_short!("swap"),
                    (&user1, false, 49_i128, 100_i128).into_val(&e)
                )),
                sub_invocations: std::vec![AuthorizedInvocation {
                    function: AuthorizedFunction::Contract((
                        token1.address.clone(),
                        symbol_short!("transfer"),
                        (&user1, &liqpool.address, 97_i128).into_val(&e)
                    )),
                    sub_invocations: std::vec![]
                }]
            }
        )]
    );

    assert_eq!(token1.balance(&user1), 803);
    assert_eq!(token1.balance(&liqpool.address), 197);
    assert_eq!(token2.balance(&user1), 949);
    assert_eq!(token2.balance(&liqpool.address), 51);

    e.cost_estimate().budget().reset_unlimited();
    liqpool.withdraw(&user1, &100, &197, &51);

    assert_eq!(
        e.auths(),
        std::vec![(
            user1.clone(),
            AuthorizedInvocation {
                function: AuthorizedFunction::Contract((
                    liqpool.address.clone(),
                    symbol_short!("withdraw"),
                    (&user1, 100_i128, 197_i128, 51_i128).into_val(&e)
                )),
                sub_invocations: std::vec![]
            }
        )]
    );

    assert_eq!(token1.balance(&user1), 1000);
    assert_eq!(token2.balance(&user1), 1000);
    assert_eq!(liqpool.balance_shares(&user1), 0);
    assert_eq!(token1.balance(&liqpool.address), 0);
    assert_eq!(token2.balance(&liqpool.address), 0);
}

#[test]
#[should_panic]
fn deposit_amount_zero_should_panic() {
    let e = Env::default();
    e.mock_all_auths();

    // Create contracts
    let admin1 = Address::generate(&e);
    let admin2 = Address::generate(&e);

    let (token1, token1_admin) = create_token_contract(&e, &admin1);
    let (token2, token2_admin) = create_token_contract(&e, &admin2);
    let liqpool = create_liqpool_contract(&e, &token1.address, &token2.address);

    // Create a user
    let user1 = Address::generate(&e);

    token1_admin.mint(&user1, &1000);
    assert_eq!(token1.balance(&user1), 1000);

    token2_admin.mint(&user1, &1000);
    assert_eq!(token2.balance(&user1), 1000);

    liqpool.deposit(&user1, &1, &0, &0, &0);
}

#[test]
#[should_panic]
fn swap_reserve_one_nonzero_other_zero() {
    let e = Env::default();
    e.mock_all_auths();

    // Create contracts
    let admin1 = Address::generate(&e);
    let admin2 = Address::generate(&e);

    let (token1, token1_admin) = create_token_contract(&e, &admin1);
    let (token2, token2_admin) = create_token_contract(&e, &admin2);

    let liqpool = create_liqpool_contract(&e, &token1.address, &token2.address);

    // Create a user
    let user1 = Address::generate(&e);

    token1_admin.mint(&user1, &1000);
    assert_eq!(token1.balance(&user1), 1000);

    token2_admin.mint(&user1, &1000);
    assert_eq!(token2.balance(&user1), 1000);

    // Try to get to a situation where the reserves are 1 and 0.
    // It shouldn't be possible.
    token2.transfer(&user1, &liqpool.address, &1);
    liqpool.swap(&user1, &false, &1, &1);
}

In any test, the first thing that is always required is an Env, which is the Soroban environment that the contract will run in.

liquidity_pool/src/test.rs
let e = Env::default();

We mock authentication checks in the tests, which allows the tests to proceed as if all users/addresses/contracts/etc. had successfully authenticated.

liquidity_pool/src/test.rs
e.mock_all_auths();

We have abstracted into a couple functions the tasks of creating token contracts and deploying a liquidity pool contract. Each are then used within the test.

liquidity_pool/src/test.rs
fn create_token_contract<'a>(
    e: &Env,
    admin: &Address,
) -> (token::Client<'a>, token::StellarAssetClient<'a>) {
    let sac = e.register_stellar_asset_contract_v2(admin.clone());
    (
        token::Client::new(e, &sac.address()),
        token::StellarAssetClient::new(e, &sac.address()),
    )
}

fn create_liqpool_contract<'a>(
    e: &Env,
    token_a: &Address,
    token_b: &Address,
) -> LiquidityPoolClient<'a> {
    LiquidityPoolClient::new(e, &e.register(crate::LiquidityPool {}, (token_a, token_b)))
}

All public functions within an impl block that is annotated with the #[contractimpl] attribute have a corresponding function generated in a generated client type. The client type will be named the same as the contract type with Client appended. For example, in our contract the contract type is LiquidityPool, and the client is named LiquidityPoolClient.

These tests examine the "typical" use-case of a liquidity pool, ensuring that the balances, returns, etc. are appropriate at various points during the test.

First, the test sets everything up with an Env, two admin addresses, two reserve tokens, a randomly generated address to act as the user of the liquidity pool, the liquidity pool itself, a pool token shares contract, and mints the reserve assets to the user address.
The user then deposits some of each asset into the liquidity pool. At this time, the following checks are done:
appropriate authorizations for deposits and transfers exist,
balances are checked for each token (token_a, token_b, and POOL) from both the user's perspective and the liqpool contract's perspective
The user performs a swap, buying token_b in exchange for token_a. The same checks as the previous step are made now, excepting the balances of POOL, since a swap has no effect on POOL tokens.
The user then withdraws all of the deposits it made, trading all of its POOL tokens in the process. The same checks are made here as were made in the deposit step.
Build the Contract
To build the contract, use the stellar contract build command.

stellar contract build

A .wasm file should be outputted in the target directory:

target/wasm32v1-none/release/soroban_liquidity_pool_contract.wasm

Run the Contract
If you have stellar-cli installed, you can invoke contract functions using it.

macOS/Linux
Windows (PowerShell)
stellar contract invoke \
    --wasm target/wasm32v1-none/release/soroban_liquidity_pool_contract.wasm \
    --id 1 \
    -- \
    deposit \
    --to GBZV3NONYSUDVTEHATQO4BCJVFXJO3XQU5K32X3XREVZKSMMOZFO4ZXR \
    --desired_a 100 \
    --min_a 98 \
    --desired_be 200 \
    --min_b 196
Tokens
The token example demonstrates how to write a token contract that implements the Token Interface.

Open in Codespaces

Open in Codeanywhere

Whisk Changes
With the release of Whisk, Protocol 23, the token interface has seen some changes to incorporate the MuxedAddress type into the transfer function. Please see the Rust SDK documentation for more details.

Run the Example
First go through the Setup process to get your development environment configured, then clone the v23.0.0 tag of soroban-examples repository:

git clone -b v23.0.0 https://github.com/stellar/soroban-examples

Or, skip the development environment setup and open this example in GitHub Codespaces or Code Anywhere.

To run the tests for the example, navigate to the hello_world directory, and use cargo test.

cd token
cargo test

You should see the output:

running 6 tests
test test::decimal_is_over_eighteen - should panic ... ok
test test::test_zero_allowance ... ok
test test::transfer_insufficient_balance - should panic ... ok
test test::transfer_from_insufficient_allowance - should panic ... ok
test test::test_burn ... ok
test test::test ... ok

Code
note
The source code for this token example is broken into several smaller modules. This is a common design pattern for more complex smart contracts.

lib
admin
allowance
balance
contract
metadata
storage_types
token/src/lib.rs
#![no_std]

mod admin;
mod allowance;
mod balance;
mod contract;
mod metadata;
mod storage_types;
mod test;

pub use crate::contract::TokenClient;

Ref: https://github.com/stellar/soroban-examples/tree/v23.0.0/token

How it Works
Tokens created on a smart contract platform can take many different forms, include a variety of different functionalities, and meet very different needs or use-cases. While each token can fulfill a unique niche, there are some "normal" features that almost all tokens will need to make use of (e.g., payments, transfers, balance queries, etc.). In an effort to minimize repetition and streamline token deployments, Soroban implements the Token Interface, which provides a uniform, predictable interface for developers and users.

Creating a Soroban token compatible contract from an existing Stellar asset is very easy, it requires deploying the built-in Stellar Asset Contract.

This example contract, however, demonstrates how a smart contract token might be constructed that doesn't take advantage of the Stellar Asset Contract, but does still satisfy the commonly used Token Interface to maximize interoperability.

Separation of Functionality
You have likely noticed that this example contract is broken into discrete modules, with each one responsible for a siloed set of functionality. This common practice helps to organize the code and make it more maintainable.

For example, most of the token logic exists in the contract.rs module. Functions like mint, burn, transfer, etc. are written and programmed in that file. The Token Interface describes how some of these functions should emit events when they occur. However, keeping all that event-emitting logic bundled in with the rest of the contract code could make it harder to track what is happening in the code, and that confusion could ultimately lead to errors.

Instead, we have a separate soroban_token_sdk::events module that takes away all the headache of emitting events when other functions run. Here is the event emitted when a token is minted:

events::MintWithAmountOnly { to, amount }.publish(&e);

Admittedly, this is a simple example, but constructing the contract this way makes it very clear to the developer what is happening and where. This function is then used by the contract.rs module whenever the mint function is invoked:

// earlier in `contract.rs`
use soroban_token_sdk::events;

pub fn mint(e: Env, to: Address, amount: i128) {
    check_nonnegative_amount(amount);
    let admin = read_administrator(&e);
    admin.require_auth();

    e.storage()
        .instance()
        .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

    receive_balance(&e, to.clone(), amount);
    events::MintWithAmountOnly { to, amount }.publish(&e);
}

This same convention is used to separate from the "main" contract code the metadata for the token, the storage type definitions, etc.

Standardized Interface, Customized Behavior
This example contract follows the standardized Token Interface, implementing all of the same functions as the Stellar Asset Contract (SAC). This gives wallets, users, developers, etc. a predictable interface to interact with the token. Even though we are implementing the same interface of functions, that doesn't mean we have to implement the same behavior inside those functions. While this example contract doesn't actually modify any of the functions that would be present in a deployed instance of the SAC, that possibility remains open to the contract developer.

By way of example, perhaps you have an NFT project, and the artist wants to have a small royalty paid every time their token transfers hands:

// This is mainly the `transfer` function from `token/src/contract.rs`
fn transfer(e: Env, from: Address, to_muxed: MuxedAddress, amount: i128) {
    from.require_auth();

    check_nonnegative_amount(amount);
    spend_balance(&e, from.clone(), amount);
    let to: Address = to_muxed.address();

    // We calculate some new amounts for payment and royalty
    let payment = (amount * 997) / 1000;
    let royalty = amount - payment
    let artist = read_artist(&e);
    receive_balance(&e, artist.clone(), royalty);
    events::TransferWithAmountOnly {
        to: artist.clone(),
        amount: royalty,
    }.publish(&e);
    receive_balance(&e, to.clone(), payment);
    events::Transfer {
        from,
        to,
        to_muxed_id: to_muxed.id(),
        amount,
    }
    .publish(&e);
}

The transfer interface is still in use, and is still the same as other tokens, but we've customized the behavior to address a specific need. Another use-case might be a tightly controlled token that requires authentication from an admin before any transfer, allowance, etc. function could be invoked.

tip
Of course, you will want your token to behave in an intuitive and transparent manner. If a user is invoking a transfer, they will expect tokens to move. If an asset issuer needs to invoke a clawback they will likely require the right kind of behavior to take place.

Tests
Open the token/src/test.rs file to follow along.

token/src/test.rs
#![cfg(test)]
extern crate std;

use crate::{contract::Token, TokenClient};
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, AuthorizedFunction, AuthorizedInvocation},
    Address, Env, FromVal, IntoVal, String, Symbol,
};

fn create_token<'a>(e: &Env, admin: &Address) -> TokenClient<'a> {
    let token_contract = e.register(
        Token,
        (
            admin,
            7_u32,
            String::from_val(e, &"name"),
            String::from_val(e, &"symbol"),
        ),
    );
    TokenClient::new(e, &token_contract)
}

#[test]
fn test() {
    let e = Env::default();
    e.mock_all_auths();

    let admin1 = Address::generate(&e);
    let admin2 = Address::generate(&e);
    let user1 = Address::generate(&e);
    let user2 = Address::generate(&e);
    let user3 = Address::generate(&e);
    let token = create_token(&e, &admin1);

    token.mint(&user1, &1000);
    assert_eq!(
        e.auths(),
        std::vec![(
            admin1.clone(),
            AuthorizedInvocation {
                function: AuthorizedFunction::Contract((
                    token.address.clone(),
                    symbol_short!("mint"),
                    (&user1, 1000_i128).into_val(&e),
                )),
                sub_invocations: std::vec![]
            }
        )]
    );
    assert_eq!(token.balance(&user1), 1000);

    token.approve(&user2, &user3, &500, &200);
    assert_eq!(
        e.auths(),
        std::vec![(
            user2.clone(),
            AuthorizedInvocation {
                function: AuthorizedFunction::Contract((
                    token.address.clone(),
                    symbol_short!("approve"),
                    (&user2, &user3, 500_i128, 200_u32).into_val(&e),
                )),
                sub_invocations: std::vec![]
            }
        )]
    );
    assert_eq!(token.allowance(&user2, &user3), 500);

    token.transfer(&user1, &user2, &600);
    assert_eq!(
        e.auths(),
        std::vec![(
            user1.clone(),
            AuthorizedInvocation {
                function: AuthorizedFunction::Contract((
                    token.address.clone(),
                    symbol_short!("transfer"),
                    (&user1, &user2, 600_i128).into_val(&e),
                )),
                sub_invocations: std::vec![]
            }
        )]
    );
    assert_eq!(token.balance(&user1), 400);
    assert_eq!(token.balance(&user2), 600);

    token.transfer_from(&user3, &user2, &user1, &400);
    assert_eq!(
        e.auths(),
        std::vec![(
            user3.clone(),
            AuthorizedInvocation {
                function: AuthorizedFunction::Contract((
                    token.address.clone(),
                    Symbol::new(&e, "transfer_from"),
                    (&user3, &user2, &user1, 400_i128).into_val(&e),
                )),
                sub_invocations: std::vec![]
            }
        )]
    );
    assert_eq!(token.balance(&user1), 800);
    assert_eq!(token.balance(&user2), 200);

    token.transfer(&user1, &user3, &300);
    assert_eq!(token.balance(&user1), 500);
    assert_eq!(token.balance(&user3), 300);

    token.set_admin(&admin2);
    assert_eq!(
        e.auths(),
        std::vec![(
            admin1.clone(),
            AuthorizedInvocation {
                function: AuthorizedFunction::Contract((
                    token.address.clone(),
                    symbol_short!("set_admin"),
                    (&admin2,).into_val(&e),
                )),
                sub_invocations: std::vec![]
            }
        )]
    );

    // Increase to 500
    token.approve(&user2, &user3, &500, &200);
    assert_eq!(token.allowance(&user2, &user3), 500);
    token.approve(&user2, &user3, &0, &200);
    assert_eq!(
        e.auths(),
        std::vec![(
            user2.clone(),
            AuthorizedInvocation {
                function: AuthorizedFunction::Contract((
                    token.address.clone(),
                    symbol_short!("approve"),
                    (&user2, &user3, 0_i128, 200_u32).into_val(&e),
                )),
                sub_invocations: std::vec![]
            }
        )]
    );
    assert_eq!(token.allowance(&user2, &user3), 0);
}

#[test]
fn test_burn() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let user1 = Address::generate(&e);
    let user2 = Address::generate(&e);
    let token = create_token(&e, &admin);

    token.mint(&user1, &1000);
    assert_eq!(token.balance(&user1), 1000);

    token.approve(&user1, &user2, &500, &200);
    assert_eq!(token.allowance(&user1, &user2), 500);

    token.burn_from(&user2, &user1, &500);
    assert_eq!(
        e.auths(),
        std::vec![(
            user2.clone(),
            AuthorizedInvocation {
                function: AuthorizedFunction::Contract((
                    token.address.clone(),
                    symbol_short!("burn_from"),
                    (&user2, &user1, 500_i128).into_val(&e),
                )),
                sub_invocations: std::vec![]
            }
        )]
    );

    assert_eq!(token.allowance(&user1, &user2), 0);
    assert_eq!(token.balance(&user1), 500);
    assert_eq!(token.balance(&user2), 0);

    token.burn(&user1, &500);
    assert_eq!(
        e.auths(),
        std::vec![(
            user1.clone(),
            AuthorizedInvocation {
                function: AuthorizedFunction::Contract((
                    token.address.clone(),
                    symbol_short!("burn"),
                    (&user1, 500_i128).into_val(&e),
                )),
                sub_invocations: std::vec![]
            }
        )]
    );

    assert_eq!(token.balance(&user1), 0);
    assert_eq!(token.balance(&user2), 0);
}

#[test]
#[should_panic(expected = "insufficient balance")]
fn transfer_insufficient_balance() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let user1 = Address::generate(&e);
    let user2 = Address::generate(&e);
    let token = create_token(&e, &admin);

    token.mint(&user1, &1000);
    assert_eq!(token.balance(&user1), 1000);

    token.transfer(&user1, &user2, &1001);
}

#[test]
#[should_panic(expected = "insufficient allowance")]
fn transfer_from_insufficient_allowance() {
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let user1 = Address::generate(&e);
    let user2 = Address::generate(&e);
    let user3 = Address::generate(&e);
    let token = create_token(&e, &admin);

    token.mint(&user1, &1000);
    assert_eq!(token.balance(&user1), 1000);

    token.approve(&user1, &user3, &100, &200);
    assert_eq!(token.allowance(&user1, &user3), 100);

    token.transfer_from(&user3, &user1, &user2, &101);
}

#[test]
#[should_panic(expected = "Decimal must not be greater than 18")]
fn decimal_is_over_eighteen() {
    let e = Env::default();
    let admin = Address::generate(&e);
    let _ = TokenClient::new(
        &e,
        &e.register(
            Token,
            (
                admin,
                19_u32,
                String::from_val(&e, &"name"),
                String::from_val(&e, &"symbol"),
            ),
        ),
    );
}

#[test]
fn test_zero_allowance() {
    // Here we test that transfer_from with a 0 amount does not create an empty allowance
    let e = Env::default();
    e.mock_all_auths();

    let admin = Address::generate(&e);
    let spender = Address::generate(&e);
    let from = Address::generate(&e);
    let token = create_token(&e, &admin);

    token.transfer_from(&spender, &from, &spender, &0);
    assert!(token.get_allowance(&from, &spender).is_none());
}

The token example implements eight different tests to cover a wide array of potential behaviors and problems. However, all of the tests start with a few common pieces. In any test, the first thing that is always required is an Env, which is the Soroban environment that the contract will run in.

let e = Env::default();

We mock authentication checks in the tests, which allows the tests to proceed as if all users/addresses/contracts/etc. had successfully authenticated.

e.mock_all_auths();

We're also using a create_token function to ease the repetition of having to register our token contract. The resulting token client is then used to invoke the contract during each test.

// It is defined at the top of the file...
fn create_token<'a>(e: &Env, admin: &Address) -> TokenClient<'a> {
    let token_contract = e.register(
        Token,
        (
            admin,
            7_u32,
            String::from_val(e, &"name"),
            String::from_val(e, &"symbol"),
        ),
    );
    TokenClient::new(e, &token_contract)
}

// ... and it is used inside each test
let token = create_token(&e, &admin);

All public functions within an impl block that has been annotated with the #[contractimpl] attribute will have a corresponding function in the test's generated client type. The client type will be named the same as the contract type with Client appended. For example, in our contract, the contract type is named Token, and the client type is named TokenClient.

The six tests created for this example contract test a range of possible conditions and ensure the contract responds appropriately to each one:

test() - This function makes use of a variety of the built-in token functions to test the "predictable" way an asset might be interacted with by a user, as well as an administrator.
test_burn() - This function ensures a burn() invocation decreases a user's balance, and that a burn_from() invocation decreases a user's balance as well as consuming another user's allowance of that balance.
transfer_insufficient_balance() - This function ensures a transfer() invocation panics when the from user doesn't have the balance to cover it.
transfer_from_insufficient_allowance() - This function ensures a user with an existing allowance for someone else's balance cannot make a transfer() greater than that allowance.
decimal_is_over_eighteen() - This function tests that constructing a token with too high of a decimal precision will not succeed.
test_zero_allowance() - This function makes sure that a transfer_from() with an zero balance doesn't create an empty allowance.
Build the Contract
To build the contract, use the stellar contract build command.

stellar contract build

A .wasm file should be outputted in the target directory:

target/wasm32v1-none/release/soroban_token_contract.wasm

Run the Contract
If you have stellar-cli installed, you can invoke contract functions using it.

macOS/Linux
Windows (PowerShell)
stellar contract invoke \
    --wasm target/wasm32v1-none/release/soroban_token_contract.wasm \
    --id 1 \
    -- \
    balance \
    --id GBZV3NONYSUDVTEHATQO4BCJVFXJO3XQU5K32X3XREVZKSMMOZFO4ZXR

Fungible Token
Source Code

Open in Codespaces

Fungible tokens represent assets where each unit is identical and interchangeable, such as currencies, commodities, or utility tokens. On Stellar, you can create fungible tokens where each token has the same value and properties, with balances and ownership tracked through Soroban smart contracts.

Overview
The fungible module provides three different Fungible Token variants that differ in how certain features like token transfers and approvals are handled:

The module provides several implementation options to suit different use cases:

Base implementation (FungibleToken with Base contract type): Suitable for most standard token use cases.
AllowList extension (FungibleToken with AllowList contract type): For tokens that require an allowlist mechanism to control who can transfer tokens.
BlockList extension (FungibleToken with BlockList contract type): For tokens that need to block specific addresses from transferring tokens.
These implementations share core functionality and a common interface, exposing identical contract functions as entry points. However, the extensions provide specialized behavior by overriding certain functions to implement their specific requirements.

Run the Example
First go through the Setup process to get your development environment configured, then clone the OpenZeppelin Stellar Contracts repository:

git clone https://github.com/OpenZeppelin/stellar-contracts
cd stellar-contracts

Or, skip the development environment setup and open this example in GitHub Codespaces or Code Anywhere.

To run the tests for the example, navigate to the fungible-token-interface directory, and use cargo test.

cd examples/fungible-token-interface
cargo test

Code
note
This example demonstrates how to use the OpenZeppelin Stellar Contracts library to create a fungible token. The library provides pre-built, audited implementations that follow best practices.

examples/fungible-token-interface/src/contract.rs
use soroban_sdk::{contract, contractimpl, token::Interface as TokenInterface, Address, Env};
use stellar_access::ownable::{self as ownable, Ownable};
use stellar_macros::{default_impl, only_owner, when_not_paused};
use stellar_pausable::pausable::{self as pausable, Pausable};
use stellar_tokens::fungible::{Base, FungibleToken};

#[contract]
pub struct FungibleTokenContract;

#[contractimpl]
impl FungibleTokenContract {
    pub fn __constructor(e: &Env, owner: Address) {
        // Set token metadata
        Base::set_metadata(
            e,
            18, // 18 decimals
            "My Token".into(),
            "TKN".into(),
        );

        // Set the contract owner
        ownable::set_owner(e, &owner);
    }

    #[only_owner]
    pub fn mint(e: &Env, to: Address, amount: i128) {
        Base::mint(e, &to, amount);
    }

    #[only_owner]
    pub fn pause(e: &Env) {
        pausable::pause(e);
    }

    #[only_owner]
    pub fn unpause(e: &Env) {
        pausable::unpause(e);
    }
}

#[default_impl]
#[contractimpl]
impl FungibleToken for FungibleTokenContract {
    type ContractType = Base;
}

#[default_impl]
#[contractimpl]
impl TokenInterface for FungibleTokenContract {
    #[when_not_paused]
    fn transfer(e: Env, from: Address, to: Address, amount: i128) {
        Base::transfer(&e, &from, &to, amount);
    }

    #[when_not_paused]
    fn transfer_from(e: Env, spender: Address, from: Address, to: Address, amount: i128) {
        Base::transfer_from(&e, &spender, &from, &to, amount);
    }

    #[when_not_paused]
    fn burn(e: Env, from: Address, amount: i128) {
        Base::burn(&e, &from, amount);
    }

    #[when_not_paused]
    fn burn_from(e: Env, spender: Address, from: Address, amount: i128) {
        Base::burn_from(&e, &spender, &from, amount);
    }

    #[when_not_paused]
    fn approve(e: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32) {
        Base::approve(&e, &from, &spender, amount, expiration_ledger);
    }

    fn allowance(e: Env, from: Address, spender: Address) -> i128 {
        Base::allowance(&e, &from, &spender)
    }

    fn balance(e: Env, id: Address) -> i128 {
        Base::balance(&e, &id)
    }

    fn decimals(e: Env) -> u32 {
        Base::decimals(&e)
    }

    fn name(e: Env) -> soroban_sdk::String {
        Base::name(&e)
    }

    fn symbol(e: Env) -> soroban_sdk::String {
        Base::symbol(&e)
    }
}

#[default_impl]
#[contractimpl]
impl Ownable for FungibleTokenContract {}

#[default_impl]
#[contractimpl]
impl Pausable for FungibleTokenContract {}

Ref: https://github.com/OpenZeppelin/stellar-contracts/tree/main/examples/fungible-token-interface

How it Works
This example demonstrates how to create a fungible token using the OpenZeppelin Stellar Contracts library. The library provides pre-built, audited implementations that follow industry best practices and security standards.

The contract implements several key features:

Token Interface Compliance: Fully implements the standard Token Interface for maximum interoperability
Ownership Control: Uses the Ownable pattern for administrative functions
Pausable Functionality: Allows the owner to pause/unpause token operations in emergency situations
Secure Minting: Only the contract owner can mint new tokens
By leveraging the OpenZeppelin library, developers can focus on their specific business logic while relying on battle-tested implementations for core token functionality.

Using OpenZeppelin Library Components
The OpenZeppelin Stellar Contracts library provides modular components that can be easily composed together:

Base: Core fungible token functionality with standard token operations
Ownable: Access control pattern for administrative functions
Pausable: Emergency stop mechanism for token operations
Macros: #[only_owner] and #[when_not_paused] for declarative access control
The #[default_impl] macro automatically generates the standard implementations, reducing boilerplate code while maintaining full compatibility with the Token Interface.

Enhanced Security Features
This example showcases several security features built into the OpenZeppelin library:

Access Control: The #[only_owner] macro ensures that only the designated owner can perform administrative actions like minting tokens or pausing the contract.

Pausable Operations: The #[when_not_paused] macro allows the contract to be paused in emergency situations, preventing transfers, burns, and approvals while still allowing balance queries.

Secure Defaults: The library implements secure defaults for all token operations, including proper authorization checks and event emissions.

tip
The OpenZeppelin Stellar Contracts library has been audited and follows industry best practices. Using these pre-built components reduces the risk of security vulnerabilities in your token contracts.

Usage
We'll create a simple token for a game's in-game currency. Players can earn tokens by completing tasks, and they can spend tokens on in-game items. The contract owner can mint new tokens as needed, and players can transfer tokens between accounts.

Here's what a basic fungible token contract might look like:

use soroban_sdk::{contract, contractimpl, Address, Env, String};
use stellar_tokens::fungible::{burnable::FungibleBurnable, Base, ContractOverrides, FungibleToken};
use stellar_access::ownable::{self as ownable, Ownable};
use stellar_macros::{default_impl, only_owner};

#[contract]
pub struct GameCurrency;

#[contractimpl]
impl GameCurrency {
    pub fn __constructor(e: &Env, initial_owner: Address) {
        // Set token metadata
        Base::set_metadata(
            e,
            8, // 8 decimals
            String::from_str(e, "Game Currency"),
            String::from_str(e, "GCUR"),
        );

        // Set the contract owner
        ownable::set_owner(e, &initial_owner);
    }

    #[only_owner]
    pub fn mint_tokens(e: &Env, to: Address, amount: i128) {
        // Mint tokens to the recipient
        Base::mint(e, &to, amount);
    }
}

#[default_impl]
#[contractimpl]
impl FungibleToken for GameCurrency {
    type ContractType = Base;
}

#[default_impl]
#[contractimpl]
impl FungibleBurnable for GameCurrency {}

Tests
The OpenZeppelin example includes comprehensive tests that verify both standard token functionality and the additional security features.

Key test scenarios include:

Token Operations: Testing mint, transfer, burn, and approval functions
Access Control: Verifying only the owner can perform administrative actions
Pausable Functionality: Ensuring token operations are properly restricted when paused
Authorization: Confirming proper authentication requirements for each function
Edge Cases: Testing boundary conditions and error scenarios
To run the tests:

cd examples/fungible-token-interface
cargo test

The tests demonstrate how the OpenZeppelin library handles complex scenarios while maintaining security and proper access control.

Build the Contract
To build the contract, use the stellar contract build command.

stellar contract build

A .wasm file should be outputted in the target directory:

target/wasm32v1-none/release/fungible_token_interface.wasm

Non-Fungible Token
Source Code

Open in Codespaces

In the world of digital assets, not all tokens are alike. This becomes important in situations like real estate, voting rights, or collectibles, where some items are valued more than others due to their usefulness, rarity, etc. On Stellar, you can create non-fungible tokens (NFTs), where each token is unique and represents something distinct, with ownership tracked through Soroban smart contracts.

Overview
The non-fungible module provides three different NFT variants that differ in how certain features like ownership tracking, token creation and destruction are handled:

Base: Contract variant that implements the base logic for the NonFungibleToken interface. Suitable for most use cases.
Consecutive: Contract variant for optimized minting of batches of tokens. Builds on top of the base variant, and overrides the necessary functions from the Base variant.
Enumerable: Contract variant that allows enumerating the tokens on-chain. Builds on top of the base variant, and overrides the necessary functions from the Base variant.
These three variants share core functionality and a common interface, exposing identical contract functions as entry-points. However, composing custom flows must be handled with extra caution. That is required because of the incompatible nature between the business logic of the different NFT variants or the need to wrap the base functionality with additional logic.

Run the Example
First go through the Setup process to get your development environment configured, then clone the OpenZeppelin Stellar Contracts repository:

git clone https://github.com/OpenZeppelin/stellar-contracts

Or, skip the development environment setup and open this example in GitHub Codespaces or Code Anywhere.

To run the tests for the example, navigate to the nft-sequential-minting directory, and use cargo test.

cd examples/nft-sequential-minting
cargo test

Code
note
This example demonstrates how to use the OpenZeppelin Stellar Contracts library to create a non-fungible token. The library provides pre-built, audited implementations that follow best practices.

examples/nft-sequential-minting/src/contract.rs
use soroban_sdk::{contract, contractimpl, Address, Env, String};
use stellar_access::ownable::{self as ownable, Ownable};
use stellar_macros::{default_impl, only_owner};
use stellar_tokens::non_fungible::{
    burnable::NonFungibleBurnable, Base, ContractOverrides, NonFungibleToken,
};

#[contract]
pub struct NonFungibleTokenContract;

#[contractimpl]
impl NonFungibleTokenContract {
    pub fn __constructor(e: &Env, owner: Address) {
        // Set token metadata
        Base::set_metadata(
            e,
            String::from_str(e, "www.example.com"),
            String::from_str(e, "My NFT Collection"),
            String::from_str(e, "MNFT"),
        );

        // Set the contract owner
        ownable::set_owner(e, &owner);
    }

    #[only_owner]
    pub fn mint(e: &Env, to: Address) -> u32 {
        Base::sequential_mint(e, &to)
    }
}

#[default_impl]
#[contractimpl]
impl NonFungibleToken for NonFungibleTokenContract {
    type ContractType = Base;
}

#[default_impl]
#[contractimpl]
impl NonFungibleBurnable for NonFungibleTokenContract {}

#[default_impl]
#[contractimpl]
impl Ownable for NonFungibleTokenContract {}

Ref: https://github.com/OpenZeppelin/stellar-contracts/tree/main/examples/nft-sequential-minting

How it Works
This example demonstrates how to create a non-fungible token using the OpenZeppelin Stellar Contracts library. The library provides pre-built, audited implementations that ensure security and follow industry best practices.

The contract implements several key features:

Sequential Minting: Automatically assigns sequential token IDs starting from 1
Ownership Control: Uses the Ownable pattern for administrative functions
Burnable Tokens: Allows token holders to burn their tokens
Secure Minting: Only the contract owner can mint new tokens
By leveraging the OpenZeppelin library, developers can focus on their specific business logic while relying on battle-tested implementations for core NFT functionality.

Using OpenZeppelin Library Components
The OpenZeppelin Stellar Contracts library provides modular components that can be easily composed together:

Base: Core non-fungible token functionality with standard NFT operations
Ownable: Access control pattern for administrative functions
NonFungibleBurnable: Extension that allows tokens to be burned
Macros: #[only_owner] for declarative access control
The #[default_impl] macro automatically generates the standard implementations, reducing boilerplate code while maintaining full compatibility with the NFT standards.

Enhanced Security Features
This example showcases several security features built into the OpenZeppelin library:

Access Control: The #[only_owner] macro ensures that only the designated owner can perform administrative actions like minting new tokens.

Sequential ID Generation: The library handles secure token ID generation, preventing collisions and ensuring uniqueness.

Secure Defaults: The library implements secure defaults for all NFT operations, including proper authorization checks and event emissions.

tip
The OpenZeppelin Stellar Contracts library has been audited and follows industry best practices. Using these pre-built components reduces the risk of security vulnerabilities in your NFT contracts.

Usage
We'll use an NFT to track game items, each having their own unique attributes. Whenever one is to be awarded to a player, it will be minted and sent to them. Players are free to keep or burn their token or trade it with other people as they see fit. Please note any account can call award_item and we might want to implement access control to restrict who can mint.

Here's what a contract for tokenized items might look like:

use soroban_sdk::{contract, contractimpl, Address, Env, String};
use stellar_macros::default_impl;
use stellar_tokens::non_fungible::{
    burnable::NonFungibleBurnable,
    Base, ContractOverrides, NonFungibleToken,
};

#[contract]
pub struct GameItem;

#[contractimpl]
impl GameItem {
    pub fn __constructor(e: &Env) {
        Base::set_metadata(
            e,
            String::from_str(e, "www.mygame.com"),
            String::from_str(e, "My Game Items Collection"),
            String::from_str(e, "MGMC"),
        );
    }

    pub fn award_item(e: &Env, to: Address) -> u32 {
        // access control might be needed
        Base::sequential_mint(e, &to)
    }
}

#[default_impl]
#[contractimpl]
impl NonFungibleToken for GameItem {
    type ContractType = Base;
}

#[default_impl]
#[contractimpl]
impl NonFungibleBurnable for GameItem {}

Tests
The OpenZeppelin example includes comprehensive tests that verify both standard NFT functionality and the additional security features.

Key test scenarios include:

Token Operations: Testing mint, transfer, burn, and approval functions
Access Control: Verifying only the owner can perform administrative actions
Token ID Generation: Ensuring sequential IDs are generated correctly
Authorization: Confirming proper authentication requirements for each function
Edge Cases: Testing boundary conditions and error scenarios
To run the tests:

cd examples/nft-sequential-minting
cargo test

The tests demonstrate how the OpenZeppelin library handles complex scenarios while maintaining security and proper access control.

Build the Contract
To build the contract, use the stellar contract build command.

stellar contract build

A .wasm file should be outputted in the target directory:

target/wasm32v1-none/release/nft_sequential_minting.wasm

Build a Dapp Frontend
This is a continuation of the Getting Started tutorial, where you should have deployed two smart contracts to the public network. In this section, we'll create a web app that interacts with the contracts via RPC calls.

Let's get started.

Initialize a frontend toolchain
You can build a Soroban app with any frontend toolchain or integrate it into any existing full-stack app. For this tutorial, we're going to use Astro. Astro works with React, Vue, Svelte, any other UI library, or no UI library at all. In this tutorial, we're not using a UI library. The Soroban-specific parts of this tutorial will be similar no matter what frontend toolchain you use.

If you're new to frontend, don't worry. We won't go too deep. But it will be useful for you to see and experience the frontend development process used by Soroban apps. We'll cover the relevant bits of JavaScript and Astro, but teaching all of frontend development and Astro is beyond the scope of this tutorial.

Let's get started.

You're going to need Node.js v18.14.1 or greater. If you haven't yet, install it now.

We want to create an Astro project with the contracts from the previous lesson. To do this, we can clone a template. You can find Soroban templates on GitHub by searching for repositories that start with "soroban-template-". For this tutorial, we'll use stellar/soroban-template-astro. We'll also use a tool called degit to clone the template without its git history. This will allow us to set it up as our own git project.

Since you have node and its package manager npm installed, you also have npx.

We're going to create a new project directory with this template to make things easier in this tutorial, so make sure you're no longer in your soroban-hello-world directory and then run:

npx degit stellar/soroban-template-astro first-soroban-app
cd first-soroban-app
git init
git add .
git commit -m "first commit: initialize from stellar/soroban-template-astro"

This project has the following directory structure, which we'll go over in more detail below.

├── contracts
│   ├── hello_world
│   └── increment
├── CONTRIBUTING.md
├── Cargo.toml
├── Cargo.lock
├── initialize.js
├── package-lock.json
├── package.json
├── packages
├── public
├── src
│   ├── components
│   │   └── Card.astro
│   ├── env.d.ts
│   ├── layouts
│   │   └── Layout.astro
│   └── pages
│       └── index.astro
└── tsconfig.json

The contracts are the same ones you walked through in the previous steps of the tutorial. Since we already deployed these contracts with aliases, we can reuse the generated contract ID files by copying them from the soroban-hello-world/.stellar directory into this project:

cp -R ../soroban-hello-world/.stellar/ .stellar

Generate an NPM package for the Hello World contract
Before we open the new frontend files, let's generate an NPM package for the Hello World contract. This is our suggested way to interact with contracts from frontends. These generated libraries work with any JavaScript project (not a specific UI like React), and make it easy to work with some of the trickiest bits of Soroban, like encoding XDR.

This is going to use the CLI command stellar contract bindings typescript:

stellar contract bindings typescript \
  --network testnet \
  --contract-id hello_world \
  --output-dir packages/hello_world

tip
Notice that we were able to use the contract alias, hello_world, in place of the contract id!

This project is set up as an NPM Workspace, and so the hello_world client library was generated in the packages directory at packages/hello_world.

We attempt to keep the code in these generated libraries readable, so go ahead and look around. Open up the new packages/hello_world directory in your editor. If you've built or contributed to Node projects, it will all look familiar. You'll see a package.json file, a src directory, a tsconfig.json, and even a README.

Generate an NPM package for the Increment contract
Though we can run stellar contract bindings typescript for each of our contracts individually, the soroban-template-astro project that we used as our template includes a very handy initialize.js script that will handle this for all of the contracts in our contracts directory.

In addition to generating the NPM packages, initialize.js will also:

Generate and fund our Stellar account
Build all of the contracts in the contracts dir
Deploy our contracts
Create handy contract clients for each contract
We have already taken care of the first three bullet points in earlier steps of this tutorial, so those tasks will be noops when we run initialize.js.

Configure initialize.js
We need to make sure that initialize.js has all of the environment variables it needs before we do anything else. Copy the .env.example file over to .env. The environment variables set in .env are used by the initialize.js script.

cp .env.example .env

Let's take a look at the contents of the .env file:

# Prefix with "PUBLIC_" to make available in Astro frontend files
PUBLIC_STELLAR_NETWORK_PASSPHRASE="Standalone Network ; February 2017"
PUBLIC_STELLAR_RPC_URL="http://localhost:8000/soroban/rpc"

STELLAR_ACCOUNT="me"
STELLAR_NETWORK="standalone"

This .env file defaults to connecting to a locally running network, but we want to configure our project to communicate with Testnet, since that is where we deployed our contracts. To do that, let's update the .env file to look like this:

# Prefix with "PUBLIC_" to make available in Astro frontend files
-PUBLIC_STELLAR_NETWORK_PASSPHRASE="Standalone Network ; February 2017"
+PUBLIC_STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
-PUBLIC_STELLAR_RPC_URL="http://localhost:8000/soroban/rpc"
+PUBLIC_STELLAR_RPC_URL="https://soroban-testnet.stellar.org:443"

-STELLAR_ACCOUNT="me"
+STELLAR_ACCOUNT="alice"
-STELLAR_NETWORK="standalone"
+STELLAR_NETWORK="testnet"

info
This .env file is used in the initialize.js script. When using the CLI, we can still use the network configuration we set up in the Setup step, or by passing the --rpc-url and --network-passphrase flags.

Run initialize.js
First let's install the Javascript dependencies:

npm install

And then let's run initialize.js:

npm run init

As mentioned above, this script attempts to build and deploy our contracts, which we have already done. The script is smart enough to check if a step has already been taken care of, and is a no-op in that case, so it is safe to run more than once.

Call the contract from the frontend
Now let's open up src/pages/index.astro and take a look at how the frontend code integrates with the NPM package we created for our contracts.

Here we can see that we're importing our generated helloWorld client from ../contracts/hello_world. We're then invoking the hello method and adding the result to the page.

src/pages/index.astro
---
import Layout from "../layouts/Layout.astro";
import Card from "../components/Card.astro";
import helloWorld from "../contracts/hello_world";
const { result } = await helloWorld.hello({ to: "you" });
const greeting = result.join(" ");
---

 ...

<h1>{greeting}</h1>

Let's see it in action! Start the dev server:

npm run dev

And open localhost:4321 in your browser. You should see the greeting from the contract!

You can try updating the { to: 'Soroban' } argument. When you save the file, the page will automatically update.

info
When you start up the dev server with npm run dev, you will see similar output in your terminal as when you ran npm run init. This is because the dev script in package.json is set up to run npm run init and astro dev, so that you can ensure that your deployed contract and your generated NPM pacakage are always in sync. If you want to just start the dev server without the initialize.js script, you can run npm run astro dev.

What's happening here?
If you inspect the page (right-click, inspect) and refresh, you'll see a couple interesting things:

The "Network" tab shows that there are no Fetch/XHR requests made. But RPC calls happen via Fetch/XHR! So how is the frontend calling the contract?
There's no JavaScript on the page. But we just wrote some JavaScript! How is it working?
This is part of Astro's philosophy: the frontend should ship with as few assets as possible. Preferably zero JavaScript. When you put JavaScript in the frontmatter, Astro will run it at build time, and then replace anything in the {...} curly brackets with the output.

When using the development server with npm run dev, it runs the frontmatter code on the server, and injects the resulting values into the page on the client.

You can try building to see this more dramatically:

npm run build

Then check the dist folder. You'll see that it built an HTML and CSS file, but no JavaScript. And if you look at the HTML file, you'll see a static "Hello Soroban" in the <h1>.

During the build, Astro made a single call to your contract, then injected the static result into the page. This is great for contract methods that don't change, but probably won't work for most contract methods. Let's integrate with the incrementor contract to see how to handle interactive methods in Astro. -->

Call the incrementor contract from the frontend
While hello is a simple view-only/read method, increment changes on-chain state. This means that someone needs to sign the transaction. So we'll need to add transaction-signing capabilities to the frontend.

The way signing works in a browser is with a wallet. Wallets can be web apps, browser extensions, standalone apps, or even separate hardware devices.

Install Freighter Extension
Right now, the wallet that best supports Soroban is Freighter. It is available as a Firefox Add-on, as well as extensions for Chrome and Brave. Go ahead and install it now.

Once it's installed, open it up by clicking the extension icon. If this is your first time using Freighter, you will need to create a new wallet. Go through the prompts to create a password and save your recovery passphrase.

Go to Settings (the gear icon) → Preferences and toggle the switch to Enable Experimental Mode. Then go back to its home screen and select "Test Net" from the top-right dropdown. Finally, if it shows the message that your Stellar address is not funded, go ahead and click the "Fund with Friendbot" button.

Now you're all set up to use Freighter as a user, and you can add it to your app.

Add the StellarWalletsKit and set it up
Even though we're using Freighter to test our app, there are more wallets that support signing smart contract transactions. To make their integration easier, we are using the StellarWalletsKit library which allows us support all Stellar Wallets with a single library.

To install this kit we are going to include the next package:

npm install @creit.tech/stellar-wallets-kit

With the package installed, we are going to create a new simple file where our instantiated kit and simple state will be located. Create the file src/stellar-wallets-kit.ts and paste this:

src/stellar-wallets-kit.ts
import {
  allowAllModules,
  FREIGHTER_ID,
  StellarWalletsKit,
} from "@creit.tech/stellar-wallets-kit";

const SELECTED_WALLET_ID = "selectedWalletId";

function getSelectedWalletId() {
  return localStorage.getItem(SELECTED_WALLET_ID);
}

const kit = new StellarWalletsKit({
  modules: allowAllModules(),
  network: import.meta.env.PUBLIC_STELLAR_NETWORK_PASSPHRASE,
  // StellarWalletsKit forces you to specify a wallet, even if the user didn't
  // select one yet, so we default to Freighter.
  // We'll work around this later in `getPublicKey`.
  selectedWalletId: getSelectedWalletId() ?? FREIGHTER_ID,
});

export const signTransaction = kit.signTransaction.bind(kit);

export async function getPublicKey() {
  if (!getSelectedWalletId()) return null;
  const { address } = await kit.getAddress();
  return address;
}

export async function setWallet(walletId: string) {
  localStorage.setItem(SELECTED_WALLET_ID, walletId);
  kit.setWallet(walletId);
}

export async function disconnect(callback?: () => Promise<void>) {
  localStorage.removeItem(SELECTED_WALLET_ID);
  kit.disconnect();
  if (callback) await callback();
}

export async function connect(callback?: () => Promise<void>) {
  await kit.openModal({
    onWalletSelected: async (option) => {
      try {
        await setWallet(option.id);
        if (callback) await callback();
      } catch (e) {
        console.error(e);
      }
      return option.id;
    },
  });
}

In the code above, we instantiate the kit with desired settings and export it. We also wrap some kit functions and add custom functionality, such as augmenting the kit by allowing it to remember which wallet options was selected between page refreshes (that's the localStorage bit). The kit requires a selectedWalletId even before the user selects one, so we also work around this limitation, as the code comment explains. You can learn more about how the kit works in the StellarWalletsKit documentation

Now we're going to add a "Connect" button to the page which will open the kit's built-in modal, and prompt the user to use their preferred wallet. Once the user picks their preferred wallet and grants permission to accept requests from the website, we will fetch the public key and the "Connect" button will be replaced with a message saying, "Signed in as [their public key]".

Now let's add a new component to the src/components directory called ConnectWallet.astro with the following content:

src/components/ConnectWallet.astro
<div id="connect-wrap" class="wrap" aria-live="polite">
  &nbsp;
  <div class="ellipsis"></div>
  <button style="display:none" data-connect aria-controls="connect-wrap">
    Connect
  </button>
  <button style="display:none" data-disconnect aria-controls="connect-wrap">
    Disconnect
  </button>
</div>

<style>
  .wrap {
    text-align: center;
    display: flex;
    width: 18em;
    margin: auto;
    justify-content: center;
    line-height: 2.7rem;
    gap: 0.5rem;
  }

  .ellipsis {
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
    white-space: nowrap;
  }
</style>

<script>
  import { getPublicKey, connect, disconnect } from "../stellar-wallets-kit";

  const ellipsis = document.querySelector(
    "#connect-wrap .ellipsis",
  ) as HTMLElement;
  const connectButton = document.querySelector("[data-connect]") as HTMLButtonElement;
  const disconnectButton = document.querySelector(
    "[data-disconnect]",
  ) as HTMLButtonElement;

  async function showDisconnected() {
    ellipsis.innerHTML = "";
    ellipsis.removeAttribute("title");
    connectButton.style.removeProperty("display");
    disconnectButton.style.display = "none";
  }

  async function showConnected() {
    const publicKey = await getPublicKey();
    if (publicKey) {
      ellipsis.innerHTML = `Signed in as ${publicKey}`;
      ellipsis.title = publicKey ?? "";
      connectButton.style.display = "none";
      disconnectButton.style.removeProperty("display");
    } else {
      showDisconnected();
    }
  }

  connectButton.addEventListener("click", async () => {
    await connect(showConnected);
  });

  disconnectButton.addEventListener("click", async () => {
    disconnect(showDisconnected);
  });

  if (await getPublicKey()) {
    showConnected();
  } else {
    showDisconnected();
  }
</script>

Some of this may look surprising. <style> and <script> tags in the middle of the page? Uncreative class names like wrap? import statements in a <script>? Top-level await? What's going on here?

Astro automatically scopes the styles within a component to that component, so there's no reason for us to come up with a clever names for our classes.

And all the script declarations get bundled together and included intelligently in the page. Even if you use the same component multiple times, the script will only be included once. And yes, you can use top-level await.

You can read more about this in Astro's page about client-side scripts.

The code itself here is pretty self-explanatory. We import kit from the file we created before. Then, when the user clicks on the sign-in button, we call the connect function we created in our stellar-wallets-kit.ts file above. This will launch the built-in StellarWalletsKit modal, which allows the user to pick from the wallet options we configured (we configured all of them, with allowAllModules). We pass our own setLoggedIn function as the callback, which will be called in the onWalletSelected function in stellar-wallets-kit.ts. We end by updating the UI, based on whether the user is currently connected or not.

Now we can import the component in the frontmatter of pages/index.astro:

pages/index.astro
 ---
 import Layout from '../layouts/Layout.astro';
 import Card from '../components/Card.astro';
 import helloWorld from "../contracts/hello_world";
+import ConnectWallet from '../components/ConnectWallet.astro'
 ...

And add it right below the <h1>:

pages/index.astro
 <h1>{greeting}</h1>
+<ConnectWallet />

If you're no longer running your dev server, go ahead and restart it:

npm run dev

Then open the page and click the "Connect" button. You should see Freighter pop up and ask you to sign in. Once you do, the button should be replaced with a message saying, "Signed in as [your public key]".

Now you're ready to sign the call to increment!

Call increment
Now we can import the increment contract client from contracts/increment.ts and start using it. We'll again create a new Astro component. Create a new file at src/components/Counter.astro with the following contents:

src/components/Counter.astro
<strong>Incrementor</strong><br />
Current value: <strong id="current-value" aria-live="polite">???</strong><br />
<br />
<button data-increment aria-controls="current-value">Increment</button>

<script>
  import { getPublicKey, signTransaction } from "../stellar-wallets-kit";
  import incrementor from "../contracts/increment";
  const button = document.querySelector(
    "[data-increment]",
  ) as HTMLButtonElement;
  const currentValue = document.querySelector("#current-value") as HTMLElement;

  button.addEventListener("click", async () => {
    const publicKey = await getPublicKey();

    if (!publicKey) {
      alert("Please connect your wallet first");
      return;
    } else {
      incrementor.options.publicKey = publicKey;
      incrementor.options.signTransaction = signTransaction;
    }

    button.disabled = true;
    button.classList.add("loading");
    currentValue.innerHTML =
      currentValue.innerHTML +
      '<span class="visually-hidden"> – updating…</span>';

    try {
      const tx = await incrementor.increment();
      const { result } = await tx.signAndSend();

      // Only use `innerHTML` with contract values you trust!
      // Blindly using values from an untrusted contract opens your users to script injection attacks!
      currentValue.innerHTML = result.toString();
    } catch (e) {
      console.error(e);
    } finally {
      button.disabled = false;
      button.classList.remove("loading");
    }
  });
</script>

This should be somewhat familiar by now. We have a script that, thanks to Astro's build system, can import modules directly. We use document.querySelector to find the elements defined above. And we add a click handler to the button, which calls increment and updates the value on the page. It also sets the button to disabled and adds a loading class while the call is in progress to prevent the user from clicking it again and visually communicate that something is happening. For people using screen readers, the loading state is communicated with the visually-hidden span, which will be announced to them thanks to the aria tags we saw before.

The biggest difference from the call to greeter.hello is that this transaction gets executed in two steps. The initial call to increment constructs a Soroban transaction and then makes an RPC call to simulate it. For read-only calls like hello, this is all you need, so you can get the result right away. For write calls like increment, you then need to signAndSend before the transaction actually gets included in the ledger. You also need to make sure you set a valid publicKey and a signTransaction method.

info
Destructuring { result }: If you're new to JavaScript, you may not know what's happening with those const { result } lines. This is using JavaScript's destructuring feature. If the thing on the right of the equals sign is an object, then you can use this pattern to quickly grab specific keys from that object and assign them to variables. You can also name the variable something else, if you like. For example, try changing the code above to:

const { result: newValue } = ...

Also, notice that you don't need to manually specify Freighter as the wallet in the call to increment. This may change in the future, but while Freighter is the only game in town, these generated libraries automatically use it. If you want to override this behavior, you can pass a wallet option; check the latest Wallet interface in the template source for details.

Now let's use this component. In pages/index.astro, first import it:

pages/index.astro
 ---
 import Layout from '../layouts/Layout.astro';
 import Card from '../components/Card.astro';
 import helloWorld from "../contracts/hello_world";
 import ConnectFreighter from '../components/ConnectFreighter.astro';
+import Counter from '../components/Counter.astro';
 ...

Then use it. Let's replace the contents of the instructions paragraph with it:

pages/index.astro
 <p class="instructions">
-  To get started, open the directory <code>src/pages</code> in your project.<br />
-  <strong>Code Challenge:</strong> Tweak the "Welcome to Astro" message above.
+  <Counter />
 </p>

Check the page; if you're still running your dev server, it should have already updated. Click the "Increment" button; you should see a Freighter confirmation. Confirm, and... the value updates! 🎉

There's obviously some functionality missing, though. For example, that ??? is a bummer. But our increment contract doesn't give us a way to query the current value without also updating it.

Before you try to update it, let's streamline the process around building, deploying, and generating clients for contracts.

Take it further
If you want to take it a bit further and make sure you understand all the pieces here, try the following:

Make a src/contracts folder with a greeter.ts and an incrementor.ts. Move the new Contract({ ... }) logic into those files. You may also want to extract the rpcUrl variable to a src/contracts/utils.ts file.
Add a get_value method to the increment contract, and use it to display the current value in the Counter component. When you run npm run dev, the initialize script will run and update the contract and the generated client.
Add a "Decrement" button to the Counter component.
Deploy your frontend. You can do this quickly and for free with GitHub. If you get stuck installing stellar-cli and deploying contracts on GitHub, check out how we did this.
Rather than using NPM scripts for everything, try using a more elegant script runner such as just. The existing npm scripts can then call just, such as "setup": "just setup".
Update the README to explain what this project is and how to use it to potential collaborators and employers 😉
Troubleshooting
Sometimes things go wrong. As a first step when troubleshooting, you may want to clone our tutorial repository and see if the problem happens there, too. If it happens there, too, then it may be a temporary problem with the Soroban network.

Here are some common issues and how to fix them.

Call to hello fails
Sometimes the call to hello can start failing. You can obviously stub out the call and define result some other way to troubleshoot.

One of the common problems here is that the contract becomes archived. To check if this is the problem, you can re-run npm run init.

If you're still having problems, join our Discord (link above) or open an issue in GitHub.

All contract calls start throwing 403 errors
This means that Testnet is down, and you probably just need to wait a while and try again.

Wrapping up
Some of the things we did in this section:

We learned about Astro's no-JS-by-default approach
We added Astro components and learned how their script and style tags work
We saw how easy it is to interact with smart contracts from JavaScript by generating client libraries using stellar contract bindings typescript
We learned about wallets and Freighter
At this point, you've seen a full end-to-end example of building a contract on Stellar! What's next? You choose! You can:

See more complex example contracts in the Example Contracts section.
Learn more about the internal architecture and design of Soroban.
Learn how to find other templates other than stellar/soroban-template-astro, and how to build your own: Develop contract initialization frontend templates
Securing Web-Based Projects
Any application managing cryptocurrency is a frequent target of malicious actors and needs to follow security best practices. The below checklist offers guidance on the most common vulnerabilities. However, even if you follow every piece of advice, security is not guaranteed. Web security and malicious actors are constantly evolving, so it’s good to maintain a healthy amount of paranoia.

SSL/TLS
Ensure that TLS is enabled. Redirect HTTP to HTTPS where necessary to ensure that Man in the Middle attacks can’t occur and sensitive data is securely transferred between the client and browser. Enable TLS and get an SSL certificate for free at LetsEncrypt.

If you don’t have SSL/TLS enabled, stop everything and do this first.

Content security policy (CSP) headers
CSP headers tell the browser where it can download static resources from. For example, if you astralwallet.io and it requests a JavaScript file from myevilsite.com, your browser will block it unless it was whitelisted with CSP headers. You can read about how to implement CSP headers here.

Most web frameworks have a configuration file or extensions to specify your CSP policy, and the headers are auto-generated for you. For example, see Helmet for Node.js. This would have prevented the Blackwallet Hack.

HTTP strict-transport-security headers
This is an HTTP header that tells the browser that all future connections to a particular site should use HTTPS. To implement this, add the header to your website. Some web frameworks (like Django) have this built-in. This would have prevented the MyEtherWallet DNS Hack.

Storing sensitive data
Ideally, you don’t have to store much sensitive data. If you must, be sure to tread carefully. There are many strategies to store sensitive data:

Ensure sensitive data is encrypted using a proven cipher like AES-256 and stored separately from application data. Always pick up AEAD mode.
Any communication between the application server and secret server should be in a private network and/or authenticated via HMAC. Your cipher strategy will change based on whether you will be sending the ciphertext over the wire multiple times.
Back up any encryption keys you may use offline and store them only in-memory in your app.
Consult a good cryptographer and read up on best practices. Look into the documentation of your favorite web framework.
Rolling your own crypto is a bad idea. Always use tried and tested libraries such as NaCI.
Monitoring
Attackers often need to spend time exploring your website for unexpected or overlooked behavior. Examining logs defensively can help you catch onto what they’re trying to achieve. You can at least block their IP or automate blocking based on suspicious behavior.

It’s also worth setting up an error reporting (like Sentry). Often, people trigger strange bugs when trying to hack things.

Authentication weaknesses
You must build your authentication securely if you have logins for users. The best way to do this is to use something off the shelf. Both Ruby on Rails and Django have robust, built-in authentication schemes.

Many JSON web token implementations are poorly done, so ensure the library you use is audited.

Hash passwords with a time-tested scheme are good. And Balloon Hashing is also worth looking into.

We strongly prefer 2FA and require U2F or TOTP 2FA for sensitive actions. 2FA is important as email accounts are usually not very secure. Having a second factor of authentication ensures that users who accidentally stay logged on or have their password guessed are still protected.

Finally, require strong passwords. Common and short passwords can be brute-forced. Dropbox has a great open-source tool that gauges password strength fairly quickly, making it usable for user interactions.

Denial of service attacks (DOS)
DOS attacks are usually accomplished by overloading your web servers with traffic. To mitigate this risk, rate limit traffic from IPs and browser fingerprints. Sometimes people will use proxies to bypass IP rate-limiting. In the end, malicious actors can always find ways to spoof their identity, so the surest way to block DOS attacks is to implement proof of work checks in your client or use a managed service like Cloudflare.

Lockdown unused ports
Attackers will often scan your ports to see if you were negligent and left any open. Services like Heroku do this for you- read about how to enable this on AWS.

Phishing and social engineering
Phishing attacks will thwart any well-formed security infrastructure. Have clear policies published on your website and articulate them to users when they sign up (you will never ask for their password, etc.). Sign messages to your users and prompt users to check the website's domain they are on.

Scan your website and libraries for vulnerabilities
Use a tool like Snyk to scan your third-party client libraries for vulnerabilities. Make sure to keep your third-party libraries up to date. Often, upgrades are triggered by security exploits. You can use Mozilla Observatory to check your HTTP security as well.

Cross-Site Request Forgery Protection (CSRF), SQL injections
Most modern web and mobile frameworks handle both CSRF protection and SQL injections. Ensure CSRF protection is enabled and that you are using a database ORM instead of running raw SQL based on user input. For example, see what Ruby on Rails documentation says about SQL injections.
