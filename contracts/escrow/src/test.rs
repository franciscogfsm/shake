#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{StellarAssetClient, TokenClient},
    Address, Bytes, BytesN, Env,
};

const AMOUNT: i128 = 50_000_000; // €5 at 7 decimals
const DEAL: u64 = 42;

struct Setup {
    env: Env,
    client: ShakeDealClient<'static>,
    token: TokenClient<'static>,
    contract: Address,
    buyer: Address,
    seller: Address,
    expiry: u64,
}

fn setup() -> Setup {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000);
    let issuer = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(issuer);
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    StellarAssetClient::new(&env, &sac.address()).mint(&buyer, &AMOUNT);
    let contract = env.register(ShakeDeal, ());
    let client = ShakeDealClient::new(&env, &contract);
    let token = TokenClient::new(&env, &sac.address());
    Setup { env, client, token, contract, buyer, seller, expiry: 1_000 + 86_400 }
}

fn memo(env: &Env) -> soroban_sdk::String {
    soroban_sdk::String::from_str(env, "iPhone 13, 128GB")
}

fn secret(env: &Env) -> Bytes {
    Bytes::from_slice(env, b"one-time-qr-secret-0123456789abcdef")
}

fn hash_of(env: &Env, s: &Bytes) -> BytesN<32> {
    env.crypto().sha256(s).into()
}

fn lock_and_accept(s: &Setup) {
    s.client.lock(&s.buyer, &s.token.address, &AMOUNT, &DEAL, &s.expiry, &memo(&s.env), &None);
    s.client.accept(&DEAL, &s.seller, &hash_of(&s.env, &secret(&s.env)));
}

fn err(e: Error) -> soroban_sdk::Error {
    e.into()
}

/// The single address whose auth the last invocation required.
fn last_signer(env: &Env) -> Address {
    let auths = env.auths();
    assert_eq!(auths.len(), 1, "expected exactly one signer");
    auths[0].0.clone()
}

#[test]
fn lock_moves_money_into_the_contract() {
    let s = setup();
    s.client.lock(&s.buyer, &s.token.address, &AMOUNT, &DEAL, &s.expiry, &memo(&s.env), &None);
    assert_eq!(last_signer(&s.env), s.buyer);
    assert_eq!(s.token.balance(&s.buyer), 0);
    assert_eq!(s.token.balance(&s.contract), AMOUNT);
    let deal = s.client.get(&DEAL);
    assert_eq!(deal.status, Status::Locked);
    assert_eq!(deal.seller, None);
}

#[test]
fn shake_releases_to_seller_with_buyer_auth_and_secret() {
    let s = setup();
    lock_and_accept(&s);
    assert_eq!(last_signer(&s.env), s.seller);
    s.client.release(&DEAL, &secret(&s.env));
    assert_eq!(last_signer(&s.env), s.buyer);
    assert_eq!(s.token.balance(&s.seller), AMOUNT);
    assert_eq!(s.token.balance(&s.contract), 0);
    assert_eq!(s.client.get(&DEAL).status, Status::Released);
}

#[test]
fn wrong_secret_is_rejected_and_money_stays() {
    let s = setup();
    lock_and_accept(&s);
    let fake = Bytes::from_slice(&s.env, b"screenshot-of-an-old-qr");
    assert_eq!(s.client.try_release(&DEAL, &fake), Err(Ok(err(Error::WrongSecret))));
    assert_eq!(s.token.balance(&s.contract), AMOUNT);
}

#[test]
fn rotated_qr_invalidates_the_old_secret() {
    let s = setup();
    lock_and_accept(&s);
    let fresh = Bytes::from_slice(&s.env, b"rotated-secret");
    s.client.accept(&DEAL, &s.seller, &hash_of(&s.env, &fresh));
    assert_eq!(s.client.try_release(&DEAL, &secret(&s.env)), Err(Ok(err(Error::WrongSecret))));
    s.client.release(&DEAL, &fresh);
    assert_eq!(s.token.balance(&s.seller), AMOUNT);
}

#[test]
fn cannot_release_twice_or_before_seller_joins() {
    let s = setup();
    s.client.lock(&s.buyer, &s.token.address, &AMOUNT, &DEAL, &s.expiry, &memo(&s.env), &None);
    assert_eq!(s.client.try_release(&DEAL, &secret(&s.env)), Err(Ok(err(Error::NotAccepted))));
    s.client.accept(&DEAL, &s.seller, &hash_of(&s.env, &secret(&s.env)));
    s.client.release(&DEAL, &secret(&s.env));
    assert_eq!(s.client.try_release(&DEAL, &secret(&s.env)), Err(Ok(err(Error::NotOpen))));
    assert_eq!(s.client.try_refund(&DEAL), Err(Ok(err(Error::NotOpen))));
}

#[test]
fn buyer_can_withdraw_before_a_seller_joins() {
    let s = setup();
    s.client.lock(&s.buyer, &s.token.address, &AMOUNT, &DEAL, &s.expiry, &memo(&s.env), &None);
    s.client.refund(&DEAL);
    assert_eq!(last_signer(&s.env), s.buyer);
    assert_eq!(s.token.balance(&s.buyer), AMOUNT);
    assert_eq!(s.client.get(&DEAL).status, Status::Refunded);
}

#[test]
fn after_seller_joins_only_seller_can_cancel_early() {
    let s = setup();
    lock_and_accept(&s);
    s.client.refund(&DEAL);
    assert_eq!(last_signer(&s.env), s.seller);
    assert_eq!(s.token.balance(&s.buyer), AMOUNT);
}

#[test]
fn anyone_can_refund_after_expiry() {
    let s = setup();
    lock_and_accept(&s);
    s.env.ledger().set_timestamp(s.expiry);
    s.client.refund(&DEAL);
    assert!(s.env.auths().is_empty(), "expired refund needs no signer");
    assert_eq!(s.token.balance(&s.buyer), AMOUNT);
    assert_eq!(s.client.try_release(&DEAL, &secret(&s.env)), Err(Ok(err(Error::NotOpen))));
}

#[test]
fn seller_cannot_join_after_expiry() {
    let s = setup();
    s.client.lock(&s.buyer, &s.token.address, &AMOUNT, &DEAL, &s.expiry, &memo(&s.env), &None);
    s.env.ledger().set_timestamp(s.expiry + 1);
    let h = hash_of(&s.env, &secret(&s.env));
    assert_eq!(s.client.try_accept(&DEAL, &s.seller, &h), Err(Ok(err(Error::Expired))));
}

#[test]
fn seller_is_bound_once_and_cannot_be_the_buyer() {
    let s = setup();
    s.client.lock(&s.buyer, &s.token.address, &AMOUNT, &DEAL, &s.expiry, &memo(&s.env), &None);
    let h = hash_of(&s.env, &secret(&s.env));
    assert_eq!(s.client.try_accept(&DEAL, &s.buyer, &h), Err(Ok(err(Error::SellerIsBuyer))));
    s.client.accept(&DEAL, &s.seller, &h);
    let intruder = Address::generate(&s.env);
    assert_eq!(s.client.try_accept(&DEAL, &intruder, &h), Err(Ok(err(Error::NotAllowed))));
}

#[test]
fn bad_inputs_are_rejected() {
    let s = setup();
    assert_eq!(s.client.try_lock(&s.buyer, &s.token.address, &0, &DEAL, &s.expiry, &memo(&s.env), &None), Err(Ok(err(Error::InvalidAmount))));
    assert_eq!(s.client.try_lock(&s.buyer, &s.token.address, &AMOUNT, &DEAL, &500, &memo(&s.env), &None), Err(Ok(err(Error::InvalidExpiry))));
    s.client.lock(&s.buyer, &s.token.address, &AMOUNT, &DEAL, &s.expiry, &memo(&s.env), &None);
    assert_eq!(s.client.try_lock(&s.buyer, &s.token.address, &AMOUNT, &DEAL, &s.expiry, &memo(&s.env), &None), Err(Ok(err(Error::DealExists))));
    assert_eq!(s.client.try_get(&7), Err(Ok(err(Error::DealNotFound))));
}

#[test]
fn item_memo_is_stored_and_bounded() {
    let s = setup();
    s.client.lock(&s.buyer, &s.token.address, &AMOUNT, &DEAL, &s.expiry, &memo(&s.env), &None);
    assert_eq!(s.client.get(&DEAL).memo, memo(&s.env));
    let long = soroban_sdk::String::from_str(&s.env, &"x".repeat(65));
    assert_eq!(s.client.try_lock(&s.buyer, &s.token.address, &AMOUNT, &(DEAL + 1), &s.expiry, &long, &None), Err(Ok(err(Error::MemoTooLong))));
}

/* ---------------- ship mode: the shake travels in the box ---------------- */

fn ship_and_accept(s: &Setup) -> Address {
    let resolver = Address::generate(&s.env);
    s.client.lock_ship(&s.buyer, &s.token.address, &AMOUNT, &DEAL, &s.expiry, &memo(&s.env), &resolver);
    s.client.accept(&DEAL, &s.seller, &hash_of(&s.env, &secret(&s.env)));
    resolver
}

fn tracking(env: &Env) -> soroban_sdk::String {
    soroban_sdk::String::from_str(env, "CTT RR123456789PT")
}

#[test]
fn ship_buyer_scans_the_qr_in_the_box() {
    let s = setup();
    ship_and_accept(&s);
    s.client.mark_shipped(&DEAL, &tracking(&s.env));
    assert_eq!(last_signer(&s.env), s.seller);
    let deal = s.client.get(&DEAL);
    assert_eq!((deal.status, deal.mode, deal.tracking), (Status::Shipped, Mode::Ship, tracking(&s.env)));
    s.client.release(&DEAL, &secret(&s.env));
    assert_eq!(last_signer(&s.env), s.buyer);
    assert_eq!(s.token.balance(&s.seller), AMOUNT);
}

#[test]
fn ship_once_shipped_buyer_cannot_pull_the_money_even_after_expiry() {
    let s = setup();
    ship_and_accept(&s);
    s.client.mark_shipped(&DEAL, &tracking(&s.env));
    s.env.ledger().set_timestamp(s.expiry + 1);
    assert_eq!(s.client.try_refund(&DEAL), Err(Ok(err(Error::NotOpen))));
    assert_eq!(s.token.balance(&s.contract), AMOUNT);
}

#[test]
fn ship_silent_buyer_releases_to_seller_three_days_after_delivery() {
    let s = setup();
    ship_and_accept(&s);
    s.client.mark_shipped(&DEAL, &tracking(&s.env));
    s.client.mark_delivered(&DEAL);
    let after = s.client.get(&DEAL).release_after;
    assert_eq!(after, 1_000 + GRACE_SECS);
    s.env.ledger().set_timestamp(after - 1);
    assert_eq!(s.client.try_claim(&DEAL), Err(Ok(err(Error::TooEarly))));
    s.env.ledger().set_timestamp(after);
    s.client.claim(&DEAL);
    assert!(s.env.auths().is_empty(), "anyone can trigger the auto-release");
    assert_eq!(s.token.balance(&s.seller), AMOUNT);
    assert_eq!(s.client.get(&DEAL).status, Status::Released);
}

#[test]
fn ship_dispute_freezes_and_resolver_can_only_split() {
    let s = setup();
    let resolver = ship_and_accept(&s);
    s.client.mark_shipped(&DEAL, &tracking(&s.env));
    s.client.mark_delivered(&DEAL);
    s.client.dispute(&DEAL);
    assert_eq!(last_signer(&s.env), s.buyer);
    s.env.ledger().set_timestamp(1_000 + GRACE_SECS + 1);
    assert_eq!(s.client.try_claim(&DEAL), Err(Ok(err(Error::WrongStage))));
    assert_eq!(s.client.try_release(&DEAL, &secret(&s.env)), Err(Ok(err(Error::NotOpen))));
    assert_eq!(s.client.try_resolve(&DEAL, &(AMOUNT + 1)), Err(Ok(err(Error::BadSplit))));
    assert_eq!(s.client.try_resolve(&DEAL, &-1), Err(Ok(err(Error::BadSplit))));
    s.client.resolve(&DEAL, &(AMOUNT / 5));
    assert_eq!(last_signer(&s.env), resolver);
    assert_eq!(s.token.balance(&s.buyer), AMOUNT / 5);
    assert_eq!(s.token.balance(&s.seller), AMOUNT - AMOUNT / 5);
    assert_eq!(s.token.balance(&resolver), 0);
    assert_eq!(s.client.get(&DEAL).status, Status::Resolved);
}

#[test]
fn ship_dispute_window_closes_after_three_days() {
    let s = setup();
    ship_and_accept(&s);
    s.client.mark_shipped(&DEAL, &tracking(&s.env));
    s.client.mark_delivered(&DEAL);
    s.env.ledger().set_timestamp(1_000 + GRACE_SECS);
    assert_eq!(s.client.try_dispute(&DEAL), Err(Ok(err(Error::TooLate))));
}

#[test]
fn ship_steps_only_in_order_and_only_in_ship_mode() {
    let s = setup();
    lock_and_accept(&s);
    assert_eq!(s.client.try_mark_shipped(&DEAL, &tracking(&s.env)), Err(Ok(err(Error::NotShipMode))));
    assert_eq!(s.client.try_dispute(&DEAL), Err(Ok(err(Error::NotShipMode))));
    let t = setup();
    let resolver = Address::generate(&t.env);
    t.client.lock_ship(&t.buyer, &t.token.address, &AMOUNT, &DEAL, &t.expiry, &memo(&t.env), &resolver);
    assert_eq!(t.client.try_mark_shipped(&DEAL, &tracking(&t.env)), Err(Ok(err(Error::NotAccepted))));
    let h = hash_of(&t.env, &secret(&t.env));
    assert_eq!(t.client.try_accept(&DEAL, &resolver, &h), Err(Ok(err(Error::SellerIsBuyer))));
    t.client.accept(&DEAL, &t.seller, &h);
    assert_eq!(t.client.try_mark_delivered(&DEAL), Err(Ok(err(Error::WrongStage))));
    assert_eq!(t.client.try_dispute(&DEAL), Err(Ok(err(Error::WrongStage))));
    assert_eq!(t.client.try_resolve(&DEAL, &0), Err(Ok(err(Error::WrongStage))));
}

#[test]
fn ship_buyer_can_still_withdraw_before_the_seller_ships() {
    let s = setup();
    let resolver = Address::generate(&s.env);
    assert_eq!(s.client.try_lock_ship(&s.buyer, &s.token.address, &AMOUNT, &DEAL, &s.expiry, &memo(&s.env), &s.buyer), Err(Ok(err(Error::NotAllowed))));
    s.client.lock_ship(&s.buyer, &s.token.address, &AMOUNT, &DEAL, &s.expiry, &memo(&s.env), &resolver);
    s.client.refund(&DEAL);
    assert_eq!(s.token.balance(&s.buyer), AMOUNT);
}

fn hold_and_accept(s: &Setup) -> Address {
    let resolver = Address::generate(&s.env);
    s.client.lock_hold(&s.buyer, &s.token.address, &AMOUNT, &DEAL, &s.expiry, &memo(&s.env), &resolver);
    s.client.accept(&DEAL, &s.seller, &hash_of(&s.env, &secret(&s.env)));
    resolver
}

#[test]
fn hold_deposit_comes_back_by_itself_on_the_end_date() {
    let s = setup();
    hold_and_accept(&s);
    s.env.ledger().set_timestamp(s.expiry);
    s.client.refund(&DEAL);
    assert!(s.env.auths().is_empty(), "anyone can trigger the return");
    assert_eq!(s.token.balance(&s.buyer), AMOUNT);
    assert_eq!(s.client.get(&DEAL).status, Status::Refunded);
}

#[test]
fn hold_claim_then_payer_agrees_splits_exactly() {
    let s = setup();
    hold_and_accept(&s);
    assert_eq!(s.client.try_claim_damage(&DEAL, &(AMOUNT + 1)), Err(Ok(err(Error::BadSplit))));
    s.client.claim_damage(&DEAL, &(AMOUNT / 4));
    assert_eq!(last_signer(&s.env), s.seller);
    s.env.ledger().set_timestamp(s.expiry + 1);
    assert_eq!(s.client.try_claim_damage(&DEAL, &1), Err(Ok(err(Error::WrongStage))));
    s.client.agree(&DEAL);
    assert_eq!(last_signer(&s.env), s.buyer);
    assert_eq!(s.token.balance(&s.seller), AMOUNT / 4);
    assert_eq!(s.token.balance(&s.buyer), AMOUNT - AMOUNT / 4);
    assert_eq!(s.client.get(&DEAL).status, Status::Resolved);
}

#[test]
fn hold_holder_can_drop_the_claim_and_the_resolver_can_split() {
    let s = setup();
    hold_and_accept(&s);
    s.client.claim_damage(&DEAL, &AMOUNT);
    s.client.refund(&DEAL);
    assert_eq!(last_signer(&s.env), s.seller, "only the holder can drop their own claim");
    assert_eq!(s.token.balance(&s.buyer), AMOUNT);

    let t = setup();
    let resolver = hold_and_accept(&t);
    t.client.claim_damage(&DEAL, &AMOUNT);
    t.client.resolve(&DEAL, &(AMOUNT / 2));
    assert_eq!(last_signer(&t.env), resolver);
    assert_eq!(t.token.balance(&t.seller), AMOUNT / 2);
    assert_eq!(t.token.balance(&t.buyer), AMOUNT / 2);
}

#[test]
fn hold_claims_only_in_hold_mode_and_before_the_end_date() {
    let s = setup();
    lock_and_accept(&s);
    assert_eq!(s.client.try_claim_damage(&DEAL, &1), Err(Ok(err(Error::NotHoldMode))));
    assert_eq!(s.client.try_agree(&DEAL), Err(Ok(err(Error::NotHoldMode))));
    let t = setup();
    hold_and_accept(&t);
    t.env.ledger().set_timestamp(t.expiry);
    assert_eq!(t.client.try_claim_damage(&DEAL, &1), Err(Ok(err(Error::TooLate))));
    assert_eq!(t.client.try_agree(&DEAL), Err(Ok(err(Error::WrongStage))));
}

#[test]
fn approve_pays_without_qr_except_in_meet_mode() {
    let s = setup();
    lock_and_accept(&s);
    assert_eq!(s.client.try_approve(&DEAL), Err(Ok(err(Error::NotAllowed))));
    let t = setup();
    let resolver = Address::generate(&t.env);
    t.client.lock_ship(&t.buyer, &t.token.address, &AMOUNT, &DEAL, &t.expiry, &memo(&t.env), &resolver);
    assert_eq!(t.client.try_approve(&DEAL), Err(Ok(err(Error::WrongStage))));
    t.client.accept(&DEAL, &t.seller, &hash_of(&t.env, &secret(&t.env)));
    t.client.approve(&DEAL);
    assert_eq!(last_signer(&t.env), t.buyer);
    assert_eq!(t.token.balance(&t.seller), AMOUNT);
}

fn half(env: &Env) -> Bytes {
    Bytes::from_slice(env, b"buyers-half-of-the-key")
}

fn lock_with_key_and_accept(s: &Setup) {
    s.client.lock(&s.buyer, &s.token.address, &AMOUNT, &DEAL, &s.expiry, &memo(&s.env), &Some(hash_of(&s.env, &half(&s.env))));
    s.client.accept(&DEAL, &s.seller, &hash_of(&s.env, &secret(&s.env)));
}

#[test]
fn offline_settle_pays_the_seller_with_both_halves_and_no_signature() {
    let s = setup();
    lock_with_key_and_accept(&s);
    s.client.settle(&DEAL, &secret(&s.env), &half(&s.env));
    assert!(s.env.auths().is_empty(), "settle must not need anyone's signature");
    assert_eq!(s.token.balance(&s.seller), AMOUNT);
    assert_eq!(s.token.balance(&s.contract), 0);
    assert_eq!(s.client.get(&DEAL).status, Status::Released);
    assert_eq!(s.client.try_settle(&DEAL, &secret(&s.env), &half(&s.env)), Err(Ok(err(Error::NotOpen))));
}

#[test]
fn offline_settle_needs_both_right_halves() {
    let s = setup();
    lock_with_key_and_accept(&s);
    let wrong = Bytes::from_slice(&s.env, b"guessed");
    assert_eq!(s.client.try_settle(&DEAL, &secret(&s.env), &wrong), Err(Ok(err(Error::WrongHalf))));
    assert_eq!(s.client.try_settle(&DEAL, &wrong, &half(&s.env)), Err(Ok(err(Error::WrongSecret))));
    assert_eq!(s.token.balance(&s.contract), AMOUNT);
}

#[test]
fn offline_settle_needs_a_key_and_a_joined_seller() {
    let s = setup();
    s.client.lock(&s.buyer, &s.token.address, &AMOUNT, &DEAL, &s.expiry, &memo(&s.env), &Some(hash_of(&s.env, &half(&s.env))));
    assert_eq!(s.client.try_settle(&DEAL, &secret(&s.env), &half(&s.env)), Err(Ok(err(Error::NotAccepted))));
    let t = setup();
    lock_and_accept(&t);
    assert_eq!(t.client.try_settle(&DEAL, &secret(&t.env), &half(&t.env)), Err(Ok(err(Error::NotAllowed))));
}
