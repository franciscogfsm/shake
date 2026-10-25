//! SHAKE deal contract: money that only releases when buyer and seller meet.
//!
//! The buyer locks tokens. The seller joins by committing sha256(secret); the
//! secret lives only inside the seller's live QR. Release needs the buyer's
//! auth *and* that secret, i.e. both phones in the same place. Otherwise the
//! buyer is refunded after expiry (or when the seller cancels).
#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, panic_with_error, token,
    Address, Bytes, BytesN, Env, String,
};

const DAY_IN_LEDGERS: u32 = 17_280;
const BUMP_THRESHOLD: u32 = 7 * DAY_IN_LEDGERS;
const BUMP_TO: u32 = 30 * DAY_IN_LEDGERS;
const MAX_MEMO: u32 = 64;

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Status {
    Locked,
    Accepted,
    Released,
    Refunded,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Deal {
    pub buyer: Address,
    pub seller: Option<Address>,
    pub token: Address,
    pub amount: i128,
    pub hash: Option<BytesN<32>>,
    pub expiry: u64,
    pub status: Status,
    /// What is being bought, shown on the seller's phone and the public receipt.
    pub memo: String,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Deal(u64),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    DealExists = 1,
    DealNotFound = 2,
    InvalidAmount = 3,
    InvalidExpiry = 4,
    NotOpen = 5,
    NotAccepted = 6,
    WrongSecret = 7,
    Expired = 8,
    NotAllowed = 9,
    SellerIsBuyer = 10,
    MemoTooLong = 11,
}

#[contractevent]
pub struct Locked {
    #[topic]
    pub deal_id: u64,
    #[topic]
    pub buyer: Address,
    pub token: Address,
    pub amount: i128,
    pub expiry: u64,
}

#[contractevent]
pub struct Accepted {
    #[topic]
    pub deal_id: u64,
    #[topic]
    pub seller: Address,
}

#[contractevent]
pub struct Released {
    #[topic]
    pub deal_id: u64,
    #[topic]
    pub seller: Address,
    pub amount: i128,
}

#[contractevent]
pub struct Refunded {
    #[topic]
    pub deal_id: u64,
    #[topic]
    pub buyer: Address,
    pub amount: i128,
}

#[contract]
pub struct ShakeDeal;

fn load(env: &Env, deal_id: u64) -> Deal {
    env.storage()
        .persistent()
        .get(&DataKey::Deal(deal_id))
        .unwrap_or_else(|| panic_with_error!(env, Error::DealNotFound))
}

fn save(env: &Env, deal_id: u64, deal: &Deal) {
    let key = DataKey::Deal(deal_id);
    env.storage().persistent().set(&key, deal);
    env.storage().persistent().extend_ttl(&key, BUMP_THRESHOLD, BUMP_TO);
}

fn is_open(deal: &Deal) -> bool {
    matches!(deal.status, Status::Locked | Status::Accepted)
}

#[contractimpl]
impl ShakeDeal {
    /// Buyer locks `amount` of `token` until `expiry` (unix seconds) for the item in `memo`.
    pub fn lock(env: Env, buyer: Address, token: Address, amount: i128, deal_id: u64, expiry: u64, memo: String) {
        buyer.require_auth();
        if memo.len() > MAX_MEMO {
            panic_with_error!(&env, Error::MemoTooLong);
        }
        if amount <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        if expiry <= env.ledger().timestamp() {
            panic_with_error!(&env, Error::InvalidExpiry);
        }
        if env.storage().persistent().has(&DataKey::Deal(deal_id)) {
            panic_with_error!(&env, Error::DealExists);
        }
        token::Client::new(&env, &token).transfer(&buyer, &env.current_contract_address(), &amount);
        let deal = Deal { buyer: buyer.clone(), seller: None, token: token.clone(), amount, hash: None, expiry, status: Status::Locked, memo };
        save(&env, deal_id, &deal);
        Locked { deal_id, buyer, token, amount, expiry }.publish(&env);
    }

    /// Seller joins the deal and commits sha256 of the secret shown in their QR.
    /// The bound seller may call it again to rotate the QR before release.
    pub fn accept(env: Env, deal_id: u64, seller: Address, hash: BytesN<32>) {
        seller.require_auth();
        let mut deal = load(&env, deal_id);
        if !is_open(&deal) {
            panic_with_error!(&env, Error::NotOpen);
        }
        if env.ledger().timestamp() >= deal.expiry {
            panic_with_error!(&env, Error::Expired);
        }
        if seller == deal.buyer {
            panic_with_error!(&env, Error::SellerIsBuyer);
        }
        if let Some(bound) = &deal.seller {
            if *bound != seller {
                panic_with_error!(&env, Error::NotAllowed);
            }
        }
        deal.seller = Some(seller.clone());
        deal.hash = Some(hash);
        deal.status = Status::Accepted;
        save(&env, deal_id, &deal);
        Accepted { deal_id, seller }.publish(&env);
    }

    /// Buyer scans the seller's QR: needs buyer auth plus the secret's preimage.
    pub fn release(env: Env, deal_id: u64, secret: Bytes) {
        let mut deal = load(&env, deal_id);
        deal.buyer.require_auth();
        if deal.status != Status::Accepted {
            panic_with_error!(&env, if deal.status == Status::Locked { Error::NotAccepted } else { Error::NotOpen });
        }
        let expected = deal.hash.clone().unwrap_or_else(|| panic_with_error!(&env, Error::NotAccepted));
        let got: BytesN<32> = env.crypto().sha256(&secret).into();
        if got != expected {
            panic_with_error!(&env, Error::WrongSecret);
        }
        let seller = deal.seller.clone().unwrap_or_else(|| panic_with_error!(&env, Error::NotAccepted));
        deal.status = Status::Released;
        save(&env, deal_id, &deal);
        token::Client::new(&env, &deal.token).transfer(&env.current_contract_address(), &seller, &deal.amount);
        Released { deal_id, seller, amount: deal.amount }.publish(&env);
    }

    /// Refund to the buyer: anyone after expiry; before expiry the seller can
    /// cancel, or the buyer can withdraw while no seller has joined yet.
    pub fn refund(env: Env, deal_id: u64) {
        let mut deal = load(&env, deal_id);
        if !is_open(&deal) {
            panic_with_error!(&env, Error::NotOpen);
        }
        if env.ledger().timestamp() < deal.expiry {
            match &deal.seller {
                Some(seller) => seller.require_auth(),
                None => deal.buyer.require_auth(),
            }
        }
        deal.status = Status::Refunded;
        save(&env, deal_id, &deal);
        token::Client::new(&env, &deal.token).transfer(&env.current_contract_address(), &deal.buyer, &deal.amount);
        Refunded { deal_id, buyer: deal.buyer, amount: deal.amount }.publish(&env);
    }

    pub fn get(env: Env, deal_id: u64) -> Deal {
        load(&env, deal_id)
    }
}

mod test;
