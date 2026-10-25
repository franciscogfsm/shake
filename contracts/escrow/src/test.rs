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
    s.client.lock(&s.buyer, &s.token.address, &AMOUNT, &DEAL, &s.expiry, &memo(&s.env));
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
    s.client.lock(&s.buyer, &s.token.address, &AMOUNT, &DEAL, &s.expiry, &memo(&s.env));
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
    s.client.lock(&s.buyer, &s.token.address, &AMOUNT, &DEAL, &s.expiry, &memo(&s.env));
    assert_eq!(s.client.try_release(&DEAL, &secret(&s.env)), Err(Ok(err(Error::NotAccepted))));
    s.client.accept(&DEAL, &s.seller, &hash_of(&s.env, &secret(&s.env)));
    s.client.release(&DEAL, &secret(&s.env));
    assert_eq!(s.client.try_release(&DEAL, &secret(&s.env)), Err(Ok(err(Error::NotOpen))));
    assert_eq!(s.client.try_refund(&DEAL), Err(Ok(err(Error::NotOpen))));
}

#[test]
fn buyer_can_withdraw_before_a_seller_joins() {
    let s = setup();
    s.client.lock(&s.buyer, &s.token.address, &AMOUNT, &DEAL, &s.expiry, &memo(&s.env));
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
    s.client.lock(&s.buyer, &s.token.address, &AMOUNT, &DEAL, &s.expiry, &memo(&s.env));
    s.env.ledger().set_timestamp(s.expiry + 1);
    let h = hash_of(&s.env, &secret(&s.env));
    assert_eq!(s.client.try_accept(&DEAL, &s.seller, &h), Err(Ok(err(Error::Expired))));
}

#[test]
fn seller_is_bound_once_and_cannot_be_the_buyer() {
    let s = setup();
    s.client.lock(&s.buyer, &s.token.address, &AMOUNT, &DEAL, &s.expiry, &memo(&s.env));
    let h = hash_of(&s.env, &secret(&s.env));
    assert_eq!(s.client.try_accept(&DEAL, &s.buyer, &h), Err(Ok(err(Error::SellerIsBuyer))));
    s.client.accept(&DEAL, &s.seller, &h);
    let intruder = Address::generate(&s.env);
    assert_eq!(s.client.try_accept(&DEAL, &intruder, &h), Err(Ok(err(Error::NotAllowed))));
}

#[test]
fn bad_inputs_are_rejected() {
    let s = setup();
    assert_eq!(s.client.try_lock(&s.buyer, &s.token.address, &0, &DEAL, &s.expiry, &memo(&s.env)), Err(Ok(err(Error::InvalidAmount))));
    assert_eq!(s.client.try_lock(&s.buyer, &s.token.address, &AMOUNT, &DEAL, &500, &memo(&s.env)), Err(Ok(err(Error::InvalidExpiry))));
    s.client.lock(&s.buyer, &s.token.address, &AMOUNT, &DEAL, &s.expiry, &memo(&s.env));
    assert_eq!(s.client.try_lock(&s.buyer, &s.token.address, &AMOUNT, &DEAL, &s.expiry, &memo(&s.env)), Err(Ok(err(Error::DealExists))));
    assert_eq!(s.client.try_get(&7), Err(Ok(err(Error::DealNotFound))));
}

#[test]
fn item_memo_is_stored_and_bounded() {
    let s = setup();
    s.client.lock(&s.buyer, &s.token.address, &AMOUNT, &DEAL, &s.expiry, &memo(&s.env));
    assert_eq!(s.client.get(&DEAL).memo, memo(&s.env));
    let long = soroban_sdk::String::from_str(&s.env, &"x".repeat(65));
    assert_eq!(s.client.try_lock(&s.buyer, &s.token.address, &AMOUNT, &(DEAL + 1), &s.expiry, &long), Err(Ok(err(Error::MemoTooLong))));
}
