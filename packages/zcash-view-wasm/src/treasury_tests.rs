//! Native tests for the FROST treasury stack: DKG, rerandomized signing,
//! treasury viewing keys, PCZT summary/proving/signing and extraction.

use std::collections::{BTreeMap, VecDeque};

use rand::{rngs::StdRng, seq::SliceRandom, Rng, RngCore, SeedableRng};
use zcash_keys::{
    address::{Address, UnifiedAddress},
    keys::UnifiedFullViewingKey,
};
use zcash_protocol::consensus::{Network, NetworkUpgrade, Parameters};

use crate::frost::{self, Dkg, DkgOutput};
use crate::noise;
use crate::pczt_ops::{self, OrchardPool};
use crate::treasury;

const IRONWOOD_V6_PCZT: &[u8] = include_bytes!("../tests/fixtures/ironwood_v6.pczt");
const IRONWOOD_V6_SIGHASH: &str = "7d48149e6ae74a301bc74c7e1a5af48c52c0d20550a086899db07555e73f53a5";

fn random_uuid(rng: &mut impl RngCore) -> String {
    let mut b = [0u8; 16];
    rng.fill_bytes(&mut b);
    uuid::Builder::from_random_bytes(b).into_uuid().to_string()
}

/// Runs a full DKG among `n` simulated participants. Messages between each
/// (sender, recipient) pair are delivered in order (as frostd does), but pairs
/// are interleaved randomly, and one participant only calls `start()` late, so
/// later-phase messages routinely arrive before earlier phases complete.
fn run_dkg(n: usize, t: u16, seed: u64) -> (Vec<[u8; 32]>, Vec<DkgOutput>) {
    let mut rng = StdRng::seed_from_u64(seed);
    let secrets: Vec<[u8; 32]> = (0..n).map(|_| rng.gen()).collect();
    let pubkeys: Vec<[u8; 32]> = secrets.iter().map(noise::public_key).collect();
    let participants: Vec<String> = pubkeys.iter().map(hex::encode).collect();
    let session = random_uuid(&mut rng);

    let mut dkgs: Vec<Dkg> = secrets
        .iter()
        .map(|s| Dkg::new(s, &session, &participants, t).unwrap())
        .collect();
    let index_of = |pk: &[u8; 32]| pubkeys.iter().position(|p| p == pk).unwrap();

    // Identifiers are derived like frost-client and agree across participants.
    let uuid = uuid::Uuid::parse_str(&session).unwrap();
    for (i, d) in dkgs.iter().enumerate() {
        let expected = frost::Id::derive(&[uuid.as_bytes().as_slice(), &pubkeys[i]].concat()).unwrap();
        assert_eq!(d.identifier(), expected);
        for (j, pk) in pubkeys.iter().enumerate() {
            assert_eq!(d.identifier_of(pk).unwrap(), dkgs[j].identifier());
        }
    }

    let mut queues: BTreeMap<(usize, usize), VecDeque<Vec<u8>>> = BTreeMap::new();
    let push = |from: usize, out: Vec<frost::Outgoing>, queues: &mut BTreeMap<(usize, usize), VecDeque<Vec<u8>>>| {
        for o in out {
            queues.entry((from, index_of(&o.recipient))).or_default().push_back(o.msg);
        }
    };
    let late = n - 1;
    for (i, d) in dkgs.iter_mut().enumerate() {
        if i != late {
            let out = d.start().unwrap();
            assert_eq!(out.len(), n - 1);
            push(i, out, &mut queues);
        }
    }
    let mut late_started = false;
    let mut deliveries = 0;
    loop {
        let ready: Vec<(usize, usize)> = queues
            .iter()
            .filter(|(_, q)| !q.is_empty())
            .map(|(k, _)| *k)
            .collect();
        if !late_started && (ready.is_empty() || (deliveries > 2 * n && rng.gen_bool(0.3))) {
            let out = dkgs[late].start().unwrap();
            push(late, out, &mut queues);
            late_started = true;
            continue;
        }
        let Some(&(from, to)) = ready.choose(&mut rng) else { break };
        let msg = queues.get_mut(&(from, to)).unwrap().pop_front().unwrap();
        let out = dkgs[to].receive(&pubkeys[from], &msg).unwrap();
        push(to, out, &mut queues);
        deliveries += 1;
    }
    // n round 1 + n(n-2) echoes + n round 2 messages per recipient pair
    let echoes = n.saturating_sub(2);
    assert_eq!(deliveries, n * (n - 1) * (2 + echoes));
    assert!(dkgs.iter().all(|d| d.is_complete()), "every participant completes");
    let outputs = dkgs.iter().map(|d| d.output().unwrap()).collect();
    (secrets, outputs)
}

fn check_group(outputs: &[DkgOutput], t: u16) -> [u8; 32] {
    let gk = outputs[0].group_public_key;
    for o in outputs {
        assert_eq!(o.group_public_key, gk, "all participants agree on the group key");
        assert_eq!(*o.key_package.min_signers(), t);
        assert_eq!(o.public_key_package, outputs[0].public_key_package);
    }
    let ak = frost::spend_validating_key(&gk).expect("group key is an Orchard ak");
    assert_eq!(ak.to_bytes(), gk);
    assert_eq!(gk[31] & 0x80, 0, "ak has even y");
    gk
}

#[test]
fn dkg_3_of_3_with_shuffled_delivery() {
    for seed in 0..4 {
        let (_, outputs) = run_dkg(3, 3, seed);
        check_group(&outputs, 3);
    }
}

#[test]
fn dkg_2_of_3_with_shuffled_delivery() {
    for seed in 10..14 {
        let (_, outputs) = run_dkg(3, 2, seed);
        check_group(&outputs, 2);
    }
}

#[test]
fn dkg_2_of_2_skips_echo_and_3_of_4() {
    let (_, outputs) = run_dkg(2, 2, 20);
    check_group(&outputs, 2);
    let (_, outputs) = run_dkg(4, 3, 21);
    check_group(&outputs, 3);
}

#[test]
fn dkg_rejects_bad_setup_and_equivocation() {
    let mut rng = StdRng::seed_from_u64(30);
    let secrets: Vec<[u8; 32]> = (0..3).map(|_| rng.gen()).collect();
    let pks: Vec<String> = secrets.iter().map(|s| hex::encode(noise::public_key(s))).collect();
    let session = random_uuid(&mut rng);
    assert!(Dkg::new(&secrets[0], &session, &pks[1..], 2).is_err(), "own key missing");
    assert!(Dkg::new(&secrets[0], &session, &pks, 4).is_err(), "threshold too high");
    assert!(Dkg::new(&secrets[0], &session, &pks, 1).is_err(), "threshold too low");
    assert!(Dkg::new(&secrets[0], "not-a-uuid", &pks, 2).is_err());

    // Participant 0 equivocates: it sends participant 1 a different round 1
    // package than participant 2. The echo broadcast must catch it.
    let pubkeys: Vec<[u8; 32]> = secrets.iter().map(noise::public_key).collect();
    let mut d: Vec<Dkg> = secrets.iter().map(|s| Dkg::new(s, &session, &pks, 2).unwrap()).collect();
    let mut evil_twin = Dkg::new(&secrets[0], &session, &pks, 2).unwrap();
    let out0 = d[0].start().unwrap();
    let twin_out = evil_twin.start().unwrap();
    let out1 = d[1].start().unwrap();
    let out2 = d[2].start().unwrap();
    let to = |out: &[frost::Outgoing], pk: &[u8; 32]| out.iter().find(|o| o.recipient == *pk).unwrap().msg.clone();
    // 1 gets the honest package of 0, 2 gets the twin's
    let mut from1 = d[1].receive(&pubkeys[0], &to(&out0, &pubkeys[1])).unwrap();
    from1.extend(d[1].receive(&pubkeys[2], &to(&out2, &pubkeys[1])).unwrap());
    d[2].receive(&pubkeys[0], &to(&twin_out, &pubkeys[2])).unwrap();
    d[2].receive(&pubkeys[1], &to(&out1, &pubkeys[2])).unwrap();
    // 1's echo of 0's package reaches 2 (2nd message from 1 to 2)
    let echo_to_2 = to(&from1, &pubkeys[2]);
    let err = d[2].receive(&pubkeys[1], &echo_to_2).unwrap_err();
    assert!(err.0.contains("mismatch"), "{err}");
    assert!(!d[2].is_complete());
    assert!(d[2].output().is_err());
}

fn random_alpha(rng: &mut impl RngCore) -> String {
    use ff::{Field, PrimeField};
    hex::encode(pasta_curves::pallas::Scalar::random(rng).to_repr())
}

fn commitments_json(entries: &[(String, &str)]) -> String {
    let body: Vec<String> = entries.iter().map(|(id, c)| format!("\"{id}\":{c}")).collect();
    format!("{{{}}}", body.join(","))
}

struct Signer<'a> {
    out: &'a DkgOutput,
    key_package: String,
}

fn signer(out: &DkgOutput) -> Signer<'_> {
    Signer { out, key_package: serde_json::to_string(&out.key_package).unwrap() }
}

#[test]
fn frost_signing_2_of_3_two_spends() {
    let mut rng = StdRng::seed_from_u64(40);
    let (_, outputs) = run_dkg(3, 2, 41);
    let gk = check_group(&outputs, 2);
    let ak = frost::spend_validating_key(&gk).unwrap();
    let pkp = serde_json::to_string(&outputs[0].public_key_package).unwrap();

    let sighash: [u8; 32] = rng.gen();
    let sighash_hex = hex::encode(sighash);
    let alphas = vec![random_alpha(&mut rng), random_alpha(&mut rng)];

    let signers = [signer(&outputs[0]), signer(&outputs[2])];
    let commits: Vec<(String, String)> = signers
        .iter()
        .map(|s| frost::commit(&s.key_package, 2).unwrap())
        .collect();
    let ids: Vec<String> = signers.iter().map(|s| frost::identifier_hex(&s.out.identifier)).collect();
    let cjson = commitments_json(&[(ids[0].clone(), &commits[0].1), (ids[1].clone(), &commits[1].1)]);
    let args = frost::build_signing_package(&cjson, &sighash_hex, &alphas).unwrap();

    // frost-client wire shape
    let v: serde_json::Value = serde_json::from_str(&args).unwrap();
    assert_eq!(v["signing_package"].as_array().unwrap().len(), 2);
    assert_eq!(v["randomizer"].as_array().unwrap().len(), 2);
    assert_eq!(v["aux_msg"], "");
    assert_eq!(v["signing_package"][0]["message"], sighash_hex);
    assert_eq!(v["randomizer"][1], alphas[1]);
    assert_eq!(v["signing_package"][0]["header"]["ciphersuite"], "FROST(Pallas, BLAKE2b-512)");

    let shares: Vec<String> = signers
        .iter()
        .zip(&commits)
        .map(|(s, c)| frost::sign(&s.key_package, &c.0, &args, &sighash_hex, &alphas).unwrap())
        .collect();
    let sjson = commitments_json(&[(ids[0].clone(), &shares[0]), (ids[1].clone(), &shares[1])]);
    let sigs = frost::aggregate(&args, &sjson, &pkp).unwrap();
    assert_eq!(sigs.len(), 2);
    for (sig, alpha) in sigs.iter().zip(&alphas) {
        let alpha = frost::alpha_scalar(&hex::decode(alpha).unwrap()).unwrap();
        let rk = ak.randomize(&alpha);
        rk.verify(&sighash, &orchard::primitives::redpallas::Signature::from(*sig)).unwrap();
        // ... and not against the unrandomized key
        assert!(ak.randomize(&pasta_curves::pallas::Scalar::from(0u64))
            .verify(&sighash, &orchard::primitives::redpallas::Signature::from(*sig))
            .is_err());
    }

    // A single share is below the threshold
    let one = commitments_json(&[(ids[0].clone(), &shares[0])]);
    assert!(frost::aggregate(&args, &one, &pkp).is_err());

    // --- Tampering is rejected by frostSign ---
    let s0 = &signers[0];
    let n0 = &commits[0].0;
    // wrong expected sighash
    let other_sighash = hex::encode(rng.gen::<[u8; 32]>());
    assert!(frost::sign(&s0.key_package, n0, &args, &other_sighash, &alphas)
        .unwrap_err()
        .0
        .contains("sighash"));
    // coordinator packaged a different sighash
    let args_other = frost::build_signing_package(&cjson, &other_sighash, &alphas).unwrap();
    assert!(frost::sign(&s0.key_package, n0, &args_other, &sighash_hex, &alphas).is_err());
    // coordinator swapped a randomizer
    let alphas_other = vec![alphas[0].clone(), random_alpha(&mut rng)];
    let args_alpha = frost::build_signing_package(&cjson, &sighash_hex, &alphas_other).unwrap();
    assert!(frost::sign(&s0.key_package, n0, &args_alpha, &sighash_hex, &alphas)
        .unwrap_err()
        .0
        .contains("Randomizer"));
    // expected randomizers differ from the package
    assert!(frost::sign(&s0.key_package, n0, &args, &sighash_hex, &alphas_other).is_err());
    // coordinator substituted this signer's commitments
    let (_, fresh) = frost::commit(&s0.key_package, 2).unwrap();
    let cjson_bad = commitments_json(&[(ids[0].clone(), &fresh), (ids[1].clone(), &commits[1].1)]);
    let args_bad = frost::build_signing_package(&cjson_bad, &sighash_hex, &alphas).unwrap();
    assert!(frost::sign(&s0.key_package, n0, &args_bad, &sighash_hex, &alphas)
        .unwrap_err()
        .0
        .contains("nonces"));
    // signer left out of the package
    let cjson_missing = commitments_json(&[(ids[1].clone(), &commits[1].1)]);
    let args_missing = frost::build_signing_package(&cjson_missing, &sighash_hex, &alphas).unwrap();
    assert!(frost::sign(&s0.key_package, n0, &args_missing, &sighash_hex, &alphas).is_err());
    // spend count mismatch
    assert!(frost::sign(&s0.key_package, n0, &args, &sighash_hex, &alphas[..1]).is_err());
    // commitment count mismatch when building
    let (_, one_commit) = frost::commit(&s0.key_package, 1).unwrap();
    let cjson_short = commitments_json(&[(ids[0].clone(), &one_commit), (ids[1].clone(), &commits[1].1)]);
    assert!(frost::build_signing_package(&cjson_short, &sighash_hex, &alphas).is_err());
}

#[test]
fn treasury_viewing_key_from_dkg_key() {
    use zcash_client_backend::data_api::{
        chain::ChainState, AccountBirthday, AccountPurpose, WalletRead, WalletWrite,
    };
    use zcash_client_memory::MemoryWalletDb;

    let (_, outputs) = run_dkg(3, 2, 50);
    let gk = check_group(&outputs, 2);
    let key = treasury::treasury_key(&gk).unwrap();
    for network in [Network::MainNetwork, Network::TestNetwork] {
        let (ufvk_str, addr_str, change_str) = treasury::encode(&key, network);
        let ufvk = UnifiedFullViewingKey::decode(&network, &ufvk_str).unwrap();
        assert!(ufvk.sapling().is_none(), "no Sapling component");
        assert!(ufvk.transparent().is_none(), "no transparent component");
        let fvk = ufvk.orchard().unwrap();
        assert_eq!(orchard::keys::SpendValidatingKey::from(fvk.clone()).to_bytes(), gk);
        let Some(Address::Unified(ua)) = Address::decode(&network, &addr_str) else {
            panic!("not a UA")
        };
        assert!(ua.sapling().is_none() && ua.transparent().is_none());
        // The change address is the internal-scope Orchard address, distinct
        // from the receiving address, and derivable from the UFVK alone.
        assert_ne!(change_str, addr_str);
        assert_eq!(
            change_str,
            UnifiedAddress::from_receivers(
                Some(fvk.address_at(0u32, orchard::keys::Scope::Internal)),
                None,
                None
            )
            .unwrap()
            .encode(&network)
        );
        assert_eq!(
            crate::treasury::change_address_for_ufvk(&ufvk).unwrap().encode(&network),
            change_str
        );
        assert_eq!(ua.orchard(), Some(&fvk.address_at(0u64, orchard::keys::Scope::External)));
        // The derive helper produces the same default address
        let derived = crate::derive_unified_address_for(&ufvk_str, network, None).unwrap();
        assert_eq!(derived, addr_str);

        // The memory wallet accepts it as an account, with this as its address
        let mut db = MemoryWalletDb::new(network, 100);
        let h = network.activation_height(NetworkUpgrade::Nu6_3).unwrap();
        let birthday = AccountBirthday::from_parts(
            ChainState::empty(h, zcash_primitives::block::BlockHash([0; 32])),
            None,
        );
        db.import_account_ufvk("Treasury", &ufvk, &birthday, AccountPurpose::ViewOnly, None)
            .unwrap();
        let ids = db.get_account_ids().unwrap();
        assert_eq!(ids.len(), 1);
        // (`list_addresses` is unimplemented in zcash_client_memory; read the
        // stored addresses, which it encodes with mainnet encodings.)
        let mut buf = vec![];
        db.encode(&mut buf).unwrap();
        let wallet = <zcash_client_memory::proto::memwallet::MemoryWallet as prost::Message>::decode(&buf[..]).unwrap();
        let stored = &wallet.accounts.as_ref().unwrap().accounts[0].addresses;
        assert_eq!(stored.len(), 1);
        assert_eq!(stored[0].address, ua.encode(&Network::MainNetwork));

        // Saved state records the network
        let mut buf = crate::saved_state_header(network).to_vec();
        db.encode(&mut buf).unwrap();
        assert!(crate::decode_saved_state(&buf, network).is_ok());
        let other = match network {
            Network::MainNetwork => Network::TestNetwork,
            Network::TestNetwork => Network::MainNetwork,
        };
        assert!(crate::decode_saved_state(&buf, other).is_err());
        let body = crate::decode_saved_state(&buf, network).unwrap();
        // Legacy (headerless) states are mainnet-only
        assert!(crate::decode_saved_state(body, Network::MainNetwork).is_ok());
        assert!(crate::decode_saved_state(body, Network::TestNetwork).is_err());
        MemoryWalletDb::decode_new(body, network, 100).unwrap();
    }
    // Different calls give different viewing keys for the same ak
    let key2 = treasury::treasury_key(&gk).unwrap();
    assert_ne!(
        key.ufvk.encode(&Network::MainNetwork),
        key2.ufvk.encode(&Network::MainNetwork)
    );
    // Odd-y keys are not Orchard ak encodings
    let mut odd = gk;
    odd[31] |= 0x80;
    assert!(treasury::treasury_key(&odd).is_err());
}

/// The sighash zcash-sign computes, for cross-checking `pcztSummary`.
fn zcash_sign_sighash(pczt: &pczt::Pczt) -> [u8; 32] {
    use zcash_primitives::transaction::{
        sighash::SignableInput, sighash_v5::v5_signature_hash, sighash_v6::v6_signature_hash,
        txid::TxIdDigester, TxVersion,
    };
    let tx_data = pczt.clone().into_effects().unwrap();
    let parts = tx_data.digest(TxIdDigester);
    let h = match tx_data.version() {
        TxVersion::V6 => v6_signature_hash(&tx_data, &SignableInput::Shielded, &parts),
        _ => v5_signature_hash(&tx_data, &SignableInput::Shielded, &parts),
    };
    h.as_ref().try_into().unwrap()
}

#[test]
fn pczt_summary_of_ironwood_v6_fixture() {
    let pczt = pczt_ops::parse_pczt(IRONWOOD_V6_PCZT).unwrap();
    let summary = pczt_ops::summarize(&pczt, Network::TestNetwork, None).unwrap();
    assert_eq!(summary.tx_version, 6);
    assert_eq!(summary.sighash, IRONWOOD_V6_SIGHASH);
    assert_eq!(hex::encode(zcash_sign_sighash(&pczt)), IRONWOOD_V6_SIGHASH);
    assert!(!summary.spends.is_empty());
    for s in &summary.spends {
        assert_eq!(hex::decode(&s.alpha).unwrap().len(), 32);
        frost::alpha_scalar(&hex::decode(&s.alpha).unwrap()).unwrap();
    }
    assert!(summary.outputs.iter().all(|o| o.value_zat.parse::<u64>().is_ok()));
    assert!(summary.expiry_height > 0);
    let fee: u64 = summary.fee_zat.parse().unwrap();
    assert!(fee > 0 && fee < 1_000_000);
    println!("{summary:#?}");

    // The fixture is already proven: proving is a no-op.
    let proven = pczt_ops::prove(pczt.clone()).unwrap();
    assert_eq!(
        pczt_ops::serialize_pczt(proven).unwrap(),
        pczt_ops::serialize_pczt(pczt.clone()).unwrap()
    );

    // A signature that does not verify against rk is rejected.
    let s = &summary.spends[0];
    let pool = OrchardPool::parse(s.pool).unwrap();
    let bogus = [7u8; 64];
    assert!(pczt_ops::apply_signatures(pczt.clone(), &[(pool, s.index as usize, bogus)]).is_err());
    assert!(pczt_ops::apply_signatures(pczt, &[(pool, 999, bogus)]).is_err());
}

/// Full treasury spend without a chain: DKG → treasury FVK → an Ironwood note
/// owned by it (with a single-leaf Merkle tree) → PCZT via the transaction
/// builder → `pcztSummary` → `provePczt` → FROST commit/sign/aggregate →
/// `pcztApplySignatures` → spend finalizer + transaction extractor, which
/// verifies the proof, the spend authorization and the binding signature.
/// Builds an unproven, unsigned v6 PCZT spending a 1 ZEC Ironwood note owned by
/// `key` (at position 0 of an otherwise empty tree): 0.25 ZEC with a memo to an
/// outside address, change back to the treasury, 10,000 zat fee.
fn unproven_treasury_pczt(rng: &mut StdRng, network: Network, key: &treasury::TreasuryKey) -> pczt::Pczt {
    use incrementalmerkletree::{Hashable, Level};
    use orchard::{
        keys::Scope,
        note::{ExtractedNoteCommitment, NoteVersion, RandomSeed, Rho},
        tree::{MerkleHashOrchard, MerklePath},
        value::NoteValue,
    };
    use pczt::roles::{creator::Creator, io_finalizer::IoFinalizer};
    use zcash_primitives::transaction::{
        builder::{BuildConfig, Builder, BundlePadding},
        fees::zip317::FeeRule,
    };
    use zcash_protocol::{memo::MemoBytes, value::Zatoshis};

    let fvk = key.ufvk.orchard().unwrap().clone();
    // An Ironwood note of 1 ZEC to the treasury, at position 0 of an otherwise
    // empty tree.
    let rho = loop {
        let mut b: [u8; 32] = rng.gen();
        b[31] &= 0x3f;
        if let Some(r) = Option::from(Rho::from_bytes(&b)) {
            break r;
        }
    };
    let rseed = loop {
        if let Some(r) = Option::from(RandomSeed::from_bytes(rng.gen(), &rho)) {
            break r;
        }
    };
    let input = 100_000_000u64;
    let note = orchard::Note::from_parts(
        fvk.address_at(0u64, Scope::External),
        NoteValue::from_raw(input),
        rho,
        rseed,
        NoteVersion::V3,
    )
    .unwrap();
    let auth_path: [MerkleHashOrchard; 32] =
        std::array::from_fn(|i| MerkleHashOrchard::empty_root(Level::from(i as u8)));
    let path = MerklePath::from_parts(0, auth_path);
    let anchor = path.root(ExtractedNoteCommitment::from(note.commitment()));

    // Pay an outside Orchard address with a memo; change back to the treasury.
    let payee_sk = orchard::keys::SpendingKey::from_bytes([42; 32]).unwrap();
    let payee = orchard::keys::FullViewingKey::from(&payee_sk).address_at(0u64, Scope::External);
    let pay = 25_000_000u64;
    let fee = 10_000u64;
    let height = network.activation_height(NetworkUpgrade::Nu6_3).unwrap() + 100;
    let mut builder = Builder::new(
        network,
        height,
        BuildConfig::Standard {
            sapling_anchor: None,
            orchard_anchor: None,
            ironwood_anchor: Some(anchor),
            orchard_padding: BundlePadding::DEFAULT,
            ironwood_padding: BundlePadding::DEFAULT,
        },
    );
    let ovk = Some(fvk.to_ovk(Scope::External));
    builder.add_ironwood_spend::<std::convert::Infallible>(fvk.clone(), note, path).unwrap();
    builder
        .add_ironwood_output::<std::convert::Infallible>(
            ovk.clone(),
            payee,
            Zatoshis::from_u64(pay).unwrap(),
            MemoBytes::from_bytes(b"March payroll").unwrap(),
        )
        .unwrap();
    builder
        .add_ironwood_output::<std::convert::Infallible>(
            ovk,
            fvk.address_at(0u64, Scope::Internal),
            Zatoshis::from_u64(input - pay - fee).unwrap(),
            MemoBytes::empty(),
        )
        .unwrap();
    let fee_rule = FeeRule::standard();
    assert_eq!(u64::from(builder.get_fee(&fee_rule).unwrap()), fee);
    let result = builder.build_for_pczt(rand::rngs::OsRng, &fee_rule).unwrap();
    let pczt = Creator::build_from_parts(result.pczt_parts).unwrap();
    let pczt = IoFinalizer::new(pczt).finalize_io().unwrap();
    // Round-trip through bytes, as between browsers
    pczt_ops::parse_pczt(&pczt_ops::serialize_pczt(pczt).unwrap()).unwrap()
}


#[test]
fn end_to_end_frost_spend_of_an_ironwood_note() {
    use pczt::roles::{spend_finalizer::SpendFinalizer, tx_extractor::TransactionExtractor};
    use orchard::keys::Scope;

    let mut rng = StdRng::seed_from_u64(60);
    let network = Network::TestNetwork;
    let (_, outputs) = run_dkg(3, 2, 61);
    let gk = check_group(&outputs, 2);
    let key = treasury::treasury_key(&gk).unwrap();
    let pczt = unproven_treasury_pczt(&mut rng, network, &key);
    let input = 100_000_000u64;
    let pay = 25_000_000u64;
    let fee = 10_000u64;
    let payee_sk = orchard::keys::SpendingKey::from_bytes([42; 32]).unwrap();
    let payee = orchard::keys::FullViewingKey::from(&payee_sk).address_at(0u64, Scope::External);

    // --- Summary (what signers review) ---
    let summary = pczt_ops::summarize(&pczt, network, Some(&key.ufvk)).unwrap();
    assert_eq!(summary.tx_version, 6);
    assert_eq!(summary.fee_zat, fee.to_string());
    assert_eq!(summary.sighash, hex::encode(zcash_sign_sighash(&pczt)));
    assert_eq!(summary.spends.len(), 1);
    assert_eq!(summary.spends[0].pool, "ironwood");
    assert_eq!(summary.spends[0].value_zat.as_deref(), Some(input.to_string().as_str()));
    let payee_ua = UnifiedAddress::from_receivers(Some(payee), None, None).unwrap().encode(&network);
    let mut outs = summary.outputs.clone();
    outs.sort_by_key(|o| o.change);
    assert_eq!(outs.len(), 2);
    assert_eq!(outs[0].pool, "ironwood");
    assert_eq!(outs[0].address.as_deref(), Some(payee_ua.as_str()));
    assert_eq!(outs[0].value_zat, pay.to_string());
    assert_eq!(outs[0].memo.as_deref(), Some("March payroll"));
    assert!(!outs[0].change);
    assert!(outs[1].change);
    assert_eq!(outs[1].value_zat, (input - pay - fee).to_string());
    assert_eq!(outs[1].memo, None);
    // Without the UFVK the hand-built PCZT has no wallet metadata: nothing is change
    let plain = pczt_ops::summarize(&pczt, network, None).unwrap();
    assert!(plain.outputs.iter().all(|o| !o.change));

    // --- Prove ---
    let start = std::time::Instant::now();
    let pczt = pczt_ops::prove(pczt).unwrap();
    println!("proving (incl. key build) took {:?}", start.elapsed());
    let pczt = pczt_ops::parse_pczt(&pczt_ops::serialize_pczt(pczt).unwrap()).unwrap();
    // Proving does not change what is signed
    let summary2 = pczt_ops::summarize(&pczt, network, Some(&key.ufvk)).unwrap();
    assert_eq!(summary2, summary);

    // --- FROST sign with participants 1 and 2 ---
    let alphas: Vec<String> = summary.spends.iter().map(|s| s.alpha.clone()).collect();
    let signers = [signer(&outputs[1]), signer(&outputs[2])];
    let commits: Vec<(String, String)> = signers
        .iter()
        .map(|s| frost::commit(&s.key_package, alphas.len() as usize).unwrap())
        .collect();
    let ids: Vec<String> = signers.iter().map(|s| frost::identifier_hex(&s.out.identifier)).collect();
    let cjson = commitments_json(&[(ids[0].clone(), &commits[0].1), (ids[1].clone(), &commits[1].1)]);
    let args = frost::build_signing_package(&cjson, &summary.sighash, &alphas).unwrap();
    let shares: Vec<String> = signers
        .iter()
        .zip(&commits)
        .map(|(s, c)| frost::sign(&s.key_package, &c.0, &args, &summary.sighash, &alphas).unwrap())
        .collect();
    let sjson = commitments_json(&[(ids[0].clone(), &shares[0]), (ids[1].clone(), &shares[1])]);
    let pkp = serde_json::to_string(&outputs[0].public_key_package).unwrap();
    let sigs = frost::aggregate(&args, &sjson, &pkp).unwrap();

    let applied: Vec<(OrchardPool, usize, [u8; 64])> = summary
        .spends
        .iter()
        .zip(&sigs)
        .map(|(s, sig)| (OrchardPool::parse(s.pool).unwrap(), s.index as usize, *sig))
        .collect();
    // A signature over the wrong pool/index is rejected
    let wrong_pool: Vec<_> = applied.iter().map(|(_, i, s)| (OrchardPool::Orchard, *i, *s)).collect();
    assert!(pczt_ops::apply_signatures(pczt.clone(), &wrong_pool).is_err());
    let signed = pczt_ops::apply_signatures(pczt, &applied).unwrap();
    let signed = pczt_ops::parse_pczt(&pczt_ops::serialize_pczt(signed).unwrap()).unwrap();

    // --- Extract: verifies proof, spend auth signatures and binding signature ---
    let vk = pczt_ops::verifying_key(pczt_ops::circuit_version_for(&signed).unwrap());
    let finalized = SpendFinalizer::new(signed).finalize_spends().unwrap();
    let tx = TransactionExtractor::new(finalized)
        .with_orchard(vk)
        .extract()
        .unwrap();
    // ZIP 244: with no transparent inputs the txid digest is the shielded sighash
    assert_eq!(hex::encode(tx.txid().as_ref()), summary.sighash);
    assert!(tx.ironwood_bundle().is_some());
    let mut raw = vec![];
    tx.write(&mut raw).unwrap();
    assert!(!raw.is_empty());
}

/// A compact Orchard or Ironwood action paying `value` to `recipient`, as
/// lightwalletd would serve it.
fn compact_action(
    rng: &mut StdRng,
    recipient: orchard::Address,
    value: u64,
    pool: OrchardPool,
) -> zcash_client_backend::proto::compact_formats::CompactOrchardAction {
    use ff::{Field, PrimeField};
    use orchard::note::{ExtractedNoteCommitment, NoteVersion, Nullifier, RandomSeed, Rho};
    use zcash_note_encryption::{Domain, NoteEncryption, COMPACT_NOTE_SIZE};

    let nf = Nullifier::from_bytes(&pasta_curves::pallas::Base::random(&mut *rng).to_repr()).unwrap();
    let rho = Rho::from_bytes(&nf.to_bytes()).unwrap();
    let rseed = loop {
        if let Some(r) = Option::from(RandomSeed::from_bytes(rng.gen(), &rho)) {
            break r;
        }
    };
    let note = orchard::Note::from_parts(
        recipient,
        orchard::value::NoteValue::from_raw(value),
        rho,
        rseed,
        match pool {
            OrchardPool::Orchard => NoteVersion::V2,
            OrchardPool::Ironwood => NoteVersion::V3,
        },
    )
    .unwrap();
    let memo = zcash_protocol::memo::MemoBytes::empty().into_bytes();
    let (ciphertext, epk) = match pool {
        OrchardPool::Orchard => {
            let enc = NoteEncryption::<orchard::note_encryption::OrchardDomain>::new(None, note, memo);
            (enc.encrypt_note_plaintext(), orchard::note_encryption::OrchardDomain::epk_bytes(enc.epk()))
        }
        OrchardPool::Ironwood => {
            let enc = NoteEncryption::<orchard::note_encryption::IronwoodDomain>::new(None, note, memo);
            (enc.encrypt_note_plaintext(), orchard::note_encryption::IronwoodDomain::epk_bytes(enc.epk()))
        }
    };
    zcash_client_backend::proto::compact_formats::CompactOrchardAction {
        nullifier: nf.to_bytes().to_vec(),
        cmx: ExtractedNoteCommitment::from(note.commitment()).to_bytes().to_vec(),
        ephemeral_key: epk.0.to_vec(),
        ciphertext: ciphertext[..COMPACT_NOTE_SIZE].to_vec(),
    }
}

/// The wallet path: a treasury `MemoryWalletDb` scans an Ironwood note, then
/// `createPczt` (ZIP 321 → proposal → PCZT) → summary → prove → FROST →
/// apply → `extractTransaction`'s extract-and-store.
#[test]
fn wallet_creates_and_stores_a_frost_signed_treasury_payment() {
    use zcash_client_backend::data_api::{wallet::ConfirmationsPolicy, WalletRead};
    use zcash_client_memory::MemoryWalletDb;
    use zcash_protocol::{memo::MemoBytes, value::Zatoshis};

    let mut rng = StdRng::seed_from_u64(70);
    let network = Network::TestNetwork;
    let (_, outputs) = run_dkg(3, 2, 71);
    let gk = check_group(&outputs, 2);
    let key = treasury::treasury_key(&gk).unwrap();
    let (ufvk_str, address, change_address) = treasury::encode(&key, network);
    let ufvk = UnifiedFullViewingKey::decode(&network, &ufvk_str).unwrap();

    // A signer handed this UFVK can tie it to their own share and recompute
    // both published addresses
    let info = treasury::viewing_key_info(&ufvk).unwrap();
    assert_eq!(info.group_public_key, gk);
    assert_eq!(info.address.encode(&network), address);
    assert_eq!(info.change_address.encode(&network), change_address);
    assert_eq!(frost::key_package_group_key(&signer(&outputs[1]).key_package).unwrap(), gk);

    let funding = 100_000_000u64;
    let (mut db, next_height) = wallet_with_ironwood_note(&mut rng, network, &ufvk, funding);
    let tip = next_height - 1;
    let balance = |db: &MemoryWalletDb<Network>| {
        let s = db.get_wallet_summary(ConfirmationsPolicy::default()).unwrap().unwrap();
        let b = *s.account_balances().values().next().unwrap();
        (u64::from(b.spendable_value()), u64::from(b.total()))
    };
    assert_eq!(balance(&db), (funding, funding));

    // Payroll: an Orchard-receiver UA with a memo, and a transparent address
    let payee_sk = orchard::keys::SpendingKey::from_bytes([9; 32]).unwrap();
    let payee = orchard::keys::FullViewingKey::from(&payee_sk)
        .address_at(0u64, orchard::keys::Scope::External);
    let payee_ua = Address::Unified(UnifiedAddress::from_receivers(Some(payee), None, None).unwrap());
    let taddr = Address::Transparent(zcash_transparent::address::TransparentAddress::PublicKeyHash([3; 20]));
    let pay1 = 12_300_000u64;
    let pay2 = 1_000_000u64;
    let request = zip321::TransactionRequest::new(vec![
        zip321::Payment::new(
            payee_ua.to_zcash_address(&network),
            Some(Zatoshis::from_u64(pay1).unwrap()),
            Some(MemoBytes::from_bytes("Payroll 2026-10 / Alice".as_bytes()).unwrap()),
            None,
            None,
            vec![],
        )
        .unwrap(),
        zip321::Payment::new(
            taddr.to_zcash_address(&network),
            Some(Zatoshis::from_u64(pay2).unwrap()),
            None,
            None,
            None,
            vec![],
        )
        .unwrap(),
    ])
    .unwrap();
    let uri = request.to_uri();

    // Sapling and nonsense recipients are refused up front
    let sapling_addr = {
        let extsk = sapling_crypto::zip32::ExtendedSpendingKey::master(&[5; 32]);
        Address::Sapling(extsk.default_address().1).encode(&network)
    };
    let err = crate::wallet_ops::create_pczt(
        &mut db,
        network,
        &format!("zcash:{sapling_addr}?amount=0.1"),
        100,
    )
    .unwrap_err();
    assert_eq!(err.0, crate::wallet_ops::SAPLING_UNSUPPORTED);
    assert!(crate::wallet_ops::create_pczt(&mut db, network, "zcash:?nope", 100).is_err());
    let too_much = zip321::TransactionRequest::new(vec![zip321::Payment::new(
        payee_ua.to_zcash_address(&network),
        Some(Zatoshis::from_u64(2 * funding).unwrap()),
        None,
        None,
        None,
        vec![],
    )
    .unwrap()])
    .unwrap();
    let err = crate::wallet_ops::create_pczt(&mut db, network, &too_much.to_uri(), 100).unwrap_err();
    assert!(err.0.contains("Insufficient balance"), "{err}");

    // --- createPczt ---
    let pczt = crate::wallet_ops::create_pczt(&mut db, network, &uri, 100).unwrap();
    let pczt = pczt_ops::parse_pczt(&pczt_ops::serialize_pczt(pczt).unwrap()).unwrap();
    assert_eq!(*pczt.global().expiry_height(), u32::from(tip + 1) + 100);

    let summary = pczt_ops::summarize(&pczt, network, Some(&ufvk)).unwrap();
    println!("{summary:#?}");
    assert_eq!(summary.tx_version, 6);
    assert_eq!(summary.expiry_height, u32::from(tip + 1) + 100);
    let real_spends: Vec<_> = summary.spends.iter().filter(|s| s.value_zat.as_deref() != Some("0")).collect();
    assert_eq!(real_spends.len(), 1);
    assert_eq!(real_spends[0].pool, "ironwood");
    assert_eq!(real_spends[0].value_zat.as_deref(), Some(funding.to_string().as_str()));
    let fee: u64 = summary.fee_zat.parse().unwrap();
    // The wallet pays exactly the ZIP-317 fee that members cap it at
    assert_eq!(summary.fee_zat, summary.conventional_fee_zat);
    let to_payee: Vec<_> = summary.outputs.iter().filter(|o| !o.change).collect();
    let change: Vec<_> = summary.outputs.iter().filter(|o| o.change).collect();
    assert_eq!(to_payee.len(), 2);
    let o1 = to_payee.iter().find(|o| o.pool != "transparent").unwrap();
    assert_eq!(o1.pool, "ironwood");
    assert_eq!(o1.address.as_deref(), Some(payee_ua.encode(&network).as_str()));
    assert_eq!(o1.value_zat, pay1.to_string());
    assert_eq!(o1.memo.as_deref(), Some("Payroll 2026-10 / Alice"));
    let o2 = to_payee.iter().find(|o| o.pool == "transparent").unwrap();
    assert_eq!(o2.address.as_deref(), Some(taddr.encode(&network).as_str()));
    assert_eq!(o2.value_zat, pay2.to_string());
    assert_eq!(change.len(), 1);
    assert_eq!(change[0].pool, "ironwood");
    let change_value: u64 = change[0].value_zat.parse().unwrap();
    assert_eq!(pay1 + pay2 + change_value + fee, funding);
    // The wallet's own metadata agrees with the cryptographic change check
    let plain = pczt_ops::summarize(&pczt, network, None).unwrap();
    assert_eq!(plain.outputs, summary.outputs);
    // Members without the UFVK check change against the published change address
    assert_eq!(
        change_address,
        crate::treasury::change_address_for_ufvk(&ufvk).unwrap().encode(&network)
    );
    for o in plain.outputs.iter().filter(|o| o.change) {
        assert_eq!(o.address.as_deref(), Some(change_address.as_str()));
    }

    // --- prove, FROST-sign with participants 0 and 1, apply ---
    let pczt = pczt_ops::prove(pczt).unwrap();

    // --- the copy the server and the other signers get ---
    let redacted = pczt_ops::redact_for_signers(pczt.clone());
    let redacted = pczt_ops::parse_pczt(&pczt_ops::serialize_pczt(redacted).unwrap()).unwrap();
    let full_bytes = pczt_ops::serialize_pczt(pczt.clone()).unwrap();
    let redacted_bytes = pczt_ops::serialize_pczt(redacted.clone()).unwrap();
    let contains = |hay: &[u8], needle: &[u8]| hay.windows(needle.len()).any(|w| w == needle);
    let fvk_bytes = ufvk.orchard().unwrap().to_bytes();
    // The prover needed the full viewing key; the upload has no trace of nk or rivk
    assert!(contains(&full_bytes, &fvk_bytes[32..64]));
    assert!(!contains(&redacted_bytes, &fvk_bytes[32..64]));
    assert!(!contains(&redacted_bytes, &fvk_bytes[64..96]));
    // Members see the same transaction, outputs and fee, but not what the
    // spent notes held
    let members_view = pczt_ops::summarize(&redacted, network, Some(&ufvk)).unwrap();
    assert_eq!(members_view.sighash, summary.sighash);
    assert_eq!(members_view.outputs, summary.outputs);
    assert_eq!(members_view.fee_zat, summary.fee_zat);
    assert_eq!(members_view.conventional_fee_zat, summary.conventional_fee_zat);
    assert_eq!(members_view.spends.len(), summary.spends.len());
    for (m, s) in members_view.spends.iter().zip(&summary.spends) {
        assert_eq!((m.pool, m.index, &m.alpha), (s.pool, s.index, &s.alpha));
        assert_eq!(m.value_zat, None);
    }
    let alphas: Vec<String> = summary.spends.iter().map(|s| s.alpha.clone()).collect();
    let signers = [signer(&outputs[0]), signer(&outputs[1])];
    let commits: Vec<(String, String)> = signers
        .iter()
        .map(|s| frost::commit(&s.key_package, alphas.len()).unwrap())
        .collect();
    let ids: Vec<String> = signers.iter().map(|s| frost::identifier_hex(&s.out.identifier)).collect();
    let cjson = commitments_json(&[(ids[0].clone(), &commits[0].1), (ids[1].clone(), &commits[1].1)]);
    let args = frost::build_signing_package(&cjson, &summary.sighash, &alphas).unwrap();
    let shares: Vec<String> = signers
        .iter()
        .zip(&commits)
        .map(|(s, c)| frost::sign(&s.key_package, &c.0, &args, &summary.sighash, &alphas).unwrap())
        .collect();
    let sjson = commitments_json(&[(ids[0].clone(), &shares[0]), (ids[1].clone(), &shares[1])]);
    let pkp = serde_json::to_string(&outputs[0].public_key_package).unwrap();
    let sigs = frost::aggregate(&args, &sjson, &pkp).unwrap();
    let applied: Vec<_> = summary
        .spends
        .iter()
        .zip(&sigs)
        .map(|(s, sig)| (OrchardPool::parse(s.pool).unwrap(), s.index as usize, *sig))
        .collect();

    // Unsigned PCZTs cannot be finalized
    let mut buf = vec![];
    db.encode(&mut buf).unwrap();
    let mut scratch = MemoryWalletDb::decode_new(&buf[..], network, 100).unwrap();
    assert!(crate::wallet_ops::extract_and_store(&mut scratch, pczt.clone()).is_err());

    // Only the coordinator's full copy takes the signatures: the Signer wants
    // the viewing key to check what it signs for
    assert!(pczt_ops::apply_signatures(redacted, &applied).is_err());
    let signed = pczt_ops::apply_signatures(pczt, &applied).unwrap();
    let signed = pczt_ops::parse_pczt(&pczt_ops::serialize_pczt(signed).unwrap()).unwrap();

    // --- finalize (extract + store), short of broadcasting ---
    let (txid, tx) = crate::wallet_ops::extract_and_store(&mut db, signed.clone()).unwrap();
    // Retrying after a failed broadcast re-stores the same transaction harmlessly
    let (txid2, _) = crate::wallet_ops::extract_and_store(&mut db, signed).unwrap();
    assert_eq!(txid, txid2);
    assert_eq!(hex::encode(txid.as_ref()), summary.sighash);
    let mut raw = vec![];
    tx.write(&mut raw).unwrap();
    assert!(raw.len() > 1000);
    // The spent note is no longer spendable; the change is pending
    let (spendable, total) = balance(&db);
    assert_eq!(spendable, 0);
    assert_eq!(total, change_value);
}

/// Imports `ufvk` into a fresh memory wallet and scans a fake chain in which the
/// first block pays `value` to its default Orchard receiver as an Ironwood note.
/// Returns the wallet and the next unscanned height.
fn wallet_with_ironwood_note(
    rng: &mut StdRng,
    network: Network,
    ufvk: &UnifiedFullViewingKey,
    value: u64,
) -> (zcash_client_memory::MemoryWalletDb<Network>, zcash_protocol::consensus::BlockHeight) {
    wallet_with_note(rng, network, ufvk, value, OrchardPool::Ironwood)
}

/// Like [`wallet_with_ironwood_note`], but for `OrchardPool::Orchard` the note is
/// received in the Orchard pool a few blocks *before* NU6.3 activation (when
/// Orchard could still receive value) and the chain is scanned past activation,
/// so spending it is an Orchard → Ironwood crossing.
fn wallet_with_note(
    rng: &mut StdRng,
    network: Network,
    ufvk: &UnifiedFullViewingKey,
    value: u64,
    pool: OrchardPool,
) -> (zcash_client_memory::MemoryWalletDb<Network>, zcash_protocol::consensus::BlockHeight) {
    use zcash_client_backend::{
        data_api::{chain::{scan_cached_blocks, ChainState}, AccountBirthday, AccountPurpose, WalletWrite},
        proto::compact_formats::{ChainMetadata, CompactBlock, CompactTx},
    };
    let activation = network.activation_height(NetworkUpgrade::Nu6_3).unwrap();
    let (birthday_height, blocks) = match pool {
        OrchardPool::Ironwood => (activation + 2000, 13u32),
        OrchardPool::Orchard => (activation - 5, 20u32),
    };
    let mut db = zcash_client_memory::MemoryWalletDb::new(network, 100);
    let prior = ChainState::empty(birthday_height - 1, zcash_primitives::block::BlockHash([8; 32]));
    db.import_account_ufvk("W", ufvk, &AccountBirthday::from_parts(prior.clone(), None), AccountPurpose::ViewOnly, None)
        .unwrap();
    let cache = crate::SimpleBlockCache::new();
    let mut prev_hash = prior.block_hash().0.to_vec();
    let recipient = ufvk.orchard().unwrap().address_at(0u64, orchard::keys::Scope::External);
    let foreign = orchard::keys::FullViewingKey::from(&orchard::keys::SpendingKey::from_bytes([77; 32]).unwrap())
        .address_at(0u64, orchard::keys::Scope::External);
    let (mut orchard_size, mut ironwood_size) = (0u32, 0u32);
    for i in 0..blocks {
        let height = birthday_height + i;
        let hash: [u8; 32] = rng.gen();
        let mut tx = CompactTx { txid: rng.gen::<[u8; 32]>().to_vec(), ..Default::default() };
        if i == 0 {
            let action = compact_action(rng, recipient, value, pool);
            match pool {
                OrchardPool::Orchard => tx.actions.push(action),
                OrchardPool::Ironwood => tx.ironwood_actions.push(action),
            }
        }
        // As on the real chain, others keep using the Ironwood pool after
        // activation (a wallet with an entirely empty Ironwood tree has no
        // Ironwood anchor to build outputs against).
        if pool == OrchardPool::Orchard && height == activation + 1 {
            tx.ironwood_actions.push(compact_action(rng, foreign, 5_000_000, OrchardPool::Ironwood));
        }
        orchard_size += tx.actions.len() as u32;
        ironwood_size += tx.ironwood_actions.len() as u32;
        let vtx = if tx.actions.is_empty() && tx.ironwood_actions.is_empty() { vec![] } else { vec![tx] };
        cache.inner_mut().insert(
            height,
            CompactBlock {
                height: u64::from(height),
                hash: hash.to_vec(),
                prev_hash: prev_hash.clone(),
                vtx,
                chain_metadata: Some(ChainMetadata {
                    sapling_commitment_tree_size: 0,
                    orchard_commitment_tree_size: orchard_size,
                    ironwood_commitment_tree_size: ironwood_size,
                }),
                ..Default::default()
            },
        );
        prev_hash = hash.to_vec();
    }
    db.update_chain_tip(birthday_height + blocks - 1).unwrap();
    scan_cached_blocks(&network, &cache, &mut db, birthday_height, &prior, blocks as usize).unwrap();
    (db, birthday_height + blocks)
}

/// `zcash_client_memory` is now built with `transparent-inputs` (required for
/// PCZTs). Ordinary view wallets — UFVKs with transparent, Sapling and Orchard
/// components, including states saved by earlier builds that never reserved
/// ephemeral addresses — must still import, scan, summarize and round-trip.
#[test]
fn ordinary_view_wallets_still_work_with_transparent_inputs() {
    use zcash_client_backend::data_api::{wallet::ConfirmationsPolicy, WalletRead};
    use zcash_client_memory::{proto::memwallet as proto, MemoryWalletDb};
    use prost::Message;

    let mut rng = StdRng::seed_from_u64(80);
    for network in [Network::MainNetwork, Network::TestNetwork] {
        let usk = zcash_keys::keys::UnifiedSpendingKey::from_seed(&network, &[1; 32], zip32::AccountId::ZERO)
            .unwrap();
        let ufvk = usk.to_unified_full_viewing_key();
        assert!(ufvk.transparent().is_some() && ufvk.sapling().is_some() && ufvk.orchard().is_some());
        let (db, _) = wallet_with_ironwood_note(&mut rng, network, &ufvk, 50_000_000);
        let summary = db.get_wallet_summary(ConfirmationsPolicy::default()).unwrap().unwrap();
        let b = summary.account_balances().values().next().unwrap();
        assert_eq!(u64::from(b.spendable_value()), 50_000_000);

        // Simulate a state saved by the previous build (no ephemeral addresses)
        let mut buf = vec![];
        db.encode(&mut buf).unwrap();
        let mut wallet = proto::MemoryWallet::decode(&buf[..]).unwrap();
        for acc in wallet.accounts.iter_mut().flat_map(|a| a.accounts.iter_mut()) {
            acc.ephemeral_addresses.clear();
        }
        let mut legacy = vec![];
        wallet.encode(&mut legacy).unwrap();
        // Headerless legacy bytes are accepted as mainnet only
        if network == Network::MainNetwork {
            let body = crate::decode_saved_state(&legacy, network).unwrap();
            let restored = MemoryWalletDb::decode_new(body, network, 100).unwrap();
            let s = restored.get_wallet_summary(ConfirmationsPolicy::default()).unwrap().unwrap();
            assert_eq!(u64::from(s.account_balances().values().next().unwrap().spendable_value()), 50_000_000);
            let w = proto::MemoryWallet::decode(&legacy[..]).unwrap();
            assert!(crate::sent_transactions_from_proto(&w).is_empty());
        }
        let derived = crate::derive_unified_address_for(&ufvk.encode(&network), network, None).unwrap();
        assert!(derived.starts_with(if network == Network::MainNetwork { "u1" } else { "utest1" }));
    }
}

/// Writes the fixture for the headless-browser smoke test of the wasm build
/// (an unproven treasury PCZT plus the key material to sign it).
#[test]
#[ignore = "manual: set BROWSER_FIXTURE_OUT"]
fn dump_browser_fixture() {
    let out = std::env::var("BROWSER_FIXTURE_OUT").expect("BROWSER_FIXTURE_OUT");
    let mut rng = StdRng::seed_from_u64(90);
    let network = Network::TestNetwork;
    let (_, outputs) = run_dkg(3, 2, 91);
    let gk = check_group(&outputs, 2);
    let key = treasury::treasury_key(&gk).unwrap();
    let pczt = unproven_treasury_pczt(&mut rng, network, &key);
    let json = serde_json::json!({
        "pczt": hex::encode(pczt_ops::serialize_pczt(pczt).unwrap()),
        "network": "test",
        "ufvk": key.ufvk.encode(&network),
        "groupPublicKey": hex::encode(gk),
        "identifiers": outputs.iter().map(|o| frost::identifier_hex(&o.identifier)).collect::<Vec<_>>(),
        "keyPackages": outputs.iter().map(|o| serde_json::to_string(&o.key_package).unwrap()).collect::<Vec<_>>(),
        "publicKeyPackage": serde_json::to_string(&outputs[0].public_key_package).unwrap(),
    });
    std::fs::write(out, serde_json::to_string_pretty(&json).unwrap()).unwrap();
}

/// Verifies (proof, signatures, binding signature) a PCZT proven and signed by
/// the wasm build in a browser.
#[test]
#[ignore = "manual: set BROWSER_SIGNED_PCZT"]
fn verify_browser_signed_pczt() {
    use pczt::roles::{spend_finalizer::SpendFinalizer, tx_extractor::TransactionExtractor};
    let path = std::env::var("BROWSER_SIGNED_PCZT").expect("BROWSER_SIGNED_PCZT");
    let hex_str = std::fs::read_to_string(path).unwrap();
    let pczt = pczt_ops::parse_pczt(&hex::decode(hex_str.trim()).unwrap()).unwrap();
    let vk = pczt_ops::verifying_key(pczt_ops::circuit_version_for(&pczt).unwrap());
    let finalized = SpendFinalizer::new(pczt).finalize_spends().unwrap();
    let tx = TransactionExtractor::new(finalized).with_orchard(vk).extract().unwrap();
    println!("browser-signed transaction verifies: txid {}", tx.txid());
}


/// FROST-signs every spend `summary` lists with the given participants and
/// applies the aggregated signatures.
fn frost_sign_pczt(outputs: &[DkgOutput], signer_idx: &[usize], pczt: pczt::Pczt, summary: &pczt_ops::PcztSummary) -> pczt::Pczt {
    let alphas: Vec<String> = summary.spends.iter().map(|s| s.alpha.clone()).collect();
    let signers: Vec<Signer<'_>> = signer_idx.iter().map(|i| signer(&outputs[*i])).collect();
    let commits: Vec<(String, String)> = signers
        .iter()
        .map(|s| frost::commit(&s.key_package, alphas.len()).unwrap())
        .collect();
    let ids: Vec<String> = signers.iter().map(|s| frost::identifier_hex(&s.out.identifier)).collect();
    let cjson = commitments_json(&ids.iter().cloned().zip(commits.iter().map(|c| c.1.as_str())).collect::<Vec<_>>());
    let args = frost::build_signing_package(&cjson, &summary.sighash, &alphas).unwrap();
    let shares: Vec<String> = signers
        .iter()
        .zip(&commits)
        .map(|(s, c)| frost::sign(&s.key_package, &c.0, &args, &summary.sighash, &alphas).unwrap())
        .collect();
    let sjson = commitments_json(&ids.iter().cloned().zip(shares.iter().map(|s| s.as_str())).collect::<Vec<_>>());
    let pkp = serde_json::to_string(&outputs[0].public_key_package).unwrap();
    let sigs = frost::aggregate(&args, &sjson, &pkp).unwrap();
    let applied: Vec<_> = summary
        .spends
        .iter()
        .zip(&sigs)
        .map(|(s, sig)| (OrchardPool::parse(s.pool).unwrap(), s.index as usize, *sig))
        .collect();
    pczt_ops::apply_signatures(pczt, &applied).unwrap()
}

/// Change goes to the published change address whichever pool it lands in.
/// Spending an Orchard note after NU6.3 keeps the change in the Orchard pool
/// (paired with a fabricated zero-value spend that also needs a FROST
/// signature); spending an Ironwood note puts it in the Ironwood pool. Both
/// summaries — computed without the UFVK, as members do — report change at
/// `treasuryViewingKey(..).changeAddress`, and the Orchard-pool transaction
/// proves, signs and extracts.
#[test]
fn change_goes_to_the_published_change_address_in_both_pools() {
    use zcash_protocol::value::Zatoshis;

    let mut rng = StdRng::seed_from_u64(100);
    let network = Network::TestNetwork;
    let (_, outputs) = run_dkg(3, 2, 101);
    let gk = check_group(&outputs, 2);
    let key = treasury::treasury_key(&gk).unwrap();
    let (ufvk_str, _, change_address) = treasury::encode(&key, network);
    let ufvk = UnifiedFullViewingKey::decode(&network, &ufvk_str).unwrap();

    let payee = |seed: u8| {
        let sk = orchard::keys::SpendingKey::from_bytes([seed; 32]).unwrap();
        Address::Unified(
            UnifiedAddress::from_receivers(
                Some(orchard::keys::FullViewingKey::from(&sk).address_at(0u64, orchard::keys::Scope::External)),
                None,
                None,
            )
            .unwrap(),
        )
    };
    // Two payments, so the proposal is never a ZIP 318 canonical crossing
    let request = zip321::TransactionRequest::new(vec![
        zip321::Payment::new(payee(11).to_zcash_address(&network), Some(Zatoshis::from_u64(31_000_000).unwrap()), None, None, None, vec![]).unwrap(),
        zip321::Payment::new(payee(12).to_zcash_address(&network), Some(Zatoshis::from_u64(4_200_000).unwrap()), None, None, None, vec![]).unwrap(),
    ])
    .unwrap();
    let funding = 100_000_000u64;

    for pool in [OrchardPool::Orchard, OrchardPool::Ironwood] {
        let (mut db, _) = wallet_with_note(&mut rng, network, &ufvk, funding, pool);
        let pczt = crate::wallet_ops::create_pczt(&mut db, network, &request.to_uri(), 200).unwrap();
        let pczt = pczt_ops::parse_pczt(&pczt_ops::serialize_pczt(pczt).unwrap()).unwrap();

        let plain = pczt_ops::summarize(&pczt, network, None).unwrap();
        let keyed = pczt_ops::summarize(&pczt, network, Some(&ufvk)).unwrap();
        println!("{:?} funding: {plain:#?}", pool);
        assert_eq!(plain.outputs, keyed.outputs, "metadata and key agree on change");

        let change: Vec<_> = plain.outputs.iter().filter(|o| o.change).collect();
        assert_eq!(change.len(), 1);
        assert_eq!(change[0].pool, pool.name(), "change stays in the funding pool");
        assert_eq!(change[0].address.as_deref(), Some(change_address.as_str()));
        let payments: Vec<_> = plain.outputs.iter().filter(|o| !o.change).collect();
        assert_eq!(payments.len(), 2);
        assert!(payments.iter().all(|o| o.pool == "ironwood"));
        let fee: u64 = plain.fee_zat.parse().unwrap();
        let total: u64 = plain.outputs.iter().map(|o| o.value_zat.parse::<u64>().unwrap()).sum();
        assert_eq!(total + fee, funding);

        // Every spend awaiting a signature is the treasury's; the real one
        // carries the funding value, any others are zero-value
        assert!(plain.spends.iter().all(|s| s.pool == pool.name()));
        assert_eq!(
            plain.spends.iter().filter(|s| s.value_zat.as_deref() == Some(funding.to_string().as_str())).count(),
            1
        );
        if pool == OrchardPool::Orchard {
            assert!(
                plain.spends.iter().any(|s| s.value_zat.as_deref() == Some("0")),
                "post-NU6.3 Orchard change is paired with a zero-value spend"
            );
        }

        let pczt = pczt_ops::prove(pczt).unwrap();
        let signed = frost_sign_pczt(&outputs, &[1, 2], pczt, &plain);
        let (txid, _) = crate::wallet_ops::extract_and_store(&mut db, signed).unwrap();
        assert_eq!(hex::encode(txid.as_ref()), plain.sighash);
    }
}
