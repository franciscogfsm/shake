//! SHAKE deal contract: money that only releases when buyer and seller meet.
//!
//! The buyer locks tokens. The seller joins by committing sha256(secret); the
//! secret lives only inside the seller's live QR. Release needs the buyer's
//! auth *and* that secret, i.e. both phones in the same place. Otherwise the
//! buyer is refunded after expiry (or when the seller cancels).
//!
//! Ship mode: "the shake travels in the box". The seller puts the QR inside the
//! package; the buyer scans it on opening. If the buyer goes silent the money
//! releases to the seller 3 days after delivery, unless the buyer opened a
//! problem. A resolver chosen at lock can then only split it between the two.
#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, panic_with_error, token,
    Address, Bytes, BytesN, Env, String,
};

const DAY_IN_LEDGERS: u32 = 17_280;
const BUMP_THRESHOLD: u32 = 7 * DAY_IN_LEDGERS;
const BUMP_TO: u32 = 30 * DAY_IN_LEDGERS;
const MAX_MEMO: u32 = 64;
/// Ship mode: how long the buyer has after delivery to scan or open a problem.
pub const GRACE_SECS: u64 = 3 * 24 * 60 * 60;

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Status {
    Locked,
    Accepted,
    Released,
    Refunded,
    Shipped,
    Delivered,
    Disputed,
    Resolved,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Mode {
    Meet,
    Ship,
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
    pub mode: Mode,
    /// Ship mode only: the neutral party who can split a disputed deal (never keep it).
    pub resolver: Option<Address>,
    pub tracking: String,
    /// Ship mode: after this time anyone can release to the seller (0 until delivered).
    pub release_after: u64,
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
    NotShipMode = 12,
    WrongStage = 13,
    TooEarly = 14,
    TooLate = 15,
    BadSplit = 16,
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

#[contractevent]
pub struct Shipped {
    #[topic]
    pub deal_id: u64,
    #[topic]
    pub seller: Address,
    pub tracking: String,
}

#[contractevent]
pub struct Delivered {
    #[topic]
    pub deal_id: u64,
    #[topic]
    pub seller: Address,
    pub release_after: u64,
}

#[contractevent]
pub struct Disputed {
    #[topic]
    pub deal_id: u64,
    #[topic]
    pub buyer: Address,
}

#[contractevent]
pub struct Resolved {
    #[topic]
    pub deal_id: u64,
    #[topic]
    pub resolver: Address,
    pub to_buyer: i128,
    pub to_seller: i128,
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

fn ship_seller(env: &Env, deal: &Deal) -> Address {
    if deal.mode != Mode::Ship {
        panic_with_error!(env, Error::NotShipMode);
    }
    deal.seller.clone().unwrap_or_else(|| panic_with_error!(env, Error::NotAccepted))
}

fn pay_seller(env: &Env, deal_id: u64, deal: &mut Deal) {
    let seller = deal.seller.clone().unwrap_or_else(|| panic_with_error!(env, Error::NotAccepted));
    deal.status = Status::Released;
    save(env, deal_id, deal);
    token::Client::new(env, &deal.token).transfer(&env.current_contract_address(), &seller, &deal.amount);
    Released { deal_id, seller, amount: deal.amount }.publish(env);
}

#[allow(clippy::too_many_arguments)]
fn open_deal(env: &Env, buyer: Address, token: Address, amount: i128, deal_id: u64, expiry: u64, memo: String, mode: Mode, resolver: Option<Address>) {
    buyer.require_auth();
    if memo.len() > MAX_MEMO {
        panic_with_error!(env, Error::MemoTooLong);
    }
    if amount <= 0 {
        panic_with_error!(env, Error::InvalidAmount);
    }
    if expiry <= env.ledger().timestamp() {
        panic_with_error!(env, Error::InvalidExpiry);
    }
    if env.storage().persistent().has(&DataKey::Deal(deal_id)) {
        panic_with_error!(env, Error::DealExists);
    }
    if resolver.as_ref() == Some(&buyer) {
        panic_with_error!(env, Error::NotAllowed);
    }
    token::Client::new(env, &token).transfer(&buyer, &env.current_contract_address(), &amount);
    let deal = Deal { buyer: buyer.clone(), seller: None, token: token.clone(), amount, hash: None, expiry, status: Status::Locked, memo, mode, resolver, tracking: String::from_str(env, ""), release_after: 0 };
    save(env, deal_id, &deal);
    Locked { deal_id, buyer, token, amount, expiry }.publish(env);
}

fn is_open(deal: &Deal) -> bool {
    matches!(deal.status, Status::Locked | Status::Accepted)
}

#[contractimpl]
impl ShakeDeal {
    /// Buyer locks `amount` of `token` until `expiry` (unix seconds) for the item in `memo`.
    pub fn lock(env: Env, buyer: Address, token: Address, amount: i128, deal_id: u64, expiry: u64, memo: String) {
        open_deal(&env, buyer, token, amount, deal_id, expiry, memo, Mode::Meet, None);
    }

    /// Ship mode lock: same as `lock`, plus the resolver for problems. Refundable until the seller ships.
    #[allow(clippy::too_many_arguments)]
    pub fn lock_ship(env: Env, buyer: Address, token: Address, amount: i128, deal_id: u64, expiry: u64, memo: String, resolver: Address) {
        open_deal(&env, buyer, token, amount, deal_id, expiry, memo, Mode::Ship, Some(resolver));
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
        if seller == deal.buyer || deal.resolver.as_ref() == Some(&seller) {
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
        let in_box = deal.mode == Mode::Ship && matches!(deal.status, Status::Shipped | Status::Delivered);
        if deal.status != Status::Accepted && !in_box {
            panic_with_error!(&env, if deal.status == Status::Locked { Error::NotAccepted } else { Error::NotOpen });
        }
        let expected = deal.hash.clone().unwrap_or_else(|| panic_with_error!(&env, Error::NotAccepted));
        let got: BytesN<32> = env.crypto().sha256(&secret).into();
        if got != expected {
            panic_with_error!(&env, Error::WrongSecret);
        }
        pay_seller(&env, deal_id, &mut deal);
    }

    /// Ship mode: the seller sent the package (with the QR inside). From now on the buyer can't pull the money back.
    pub fn mark_shipped(env: Env, deal_id: u64, tracking: String) {
        let mut deal = load(&env, deal_id);
        let seller = ship_seller(&env, &deal);
        seller.require_auth();
        if deal.status != Status::Accepted {
            panic_with_error!(&env, Error::WrongStage);
        }
        if tracking.len() > MAX_MEMO {
            panic_with_error!(&env, Error::MemoTooLong);
        }
        deal.status = Status::Shipped;
        deal.tracking = tracking.clone();
        save(&env, deal_id, &deal);
        Shipped { deal_id, seller, tracking }.publish(&env);
    }

    /// Ship mode: the package arrived. Starts the buyer's 3 days to scan the QR or open a problem.
    pub fn mark_delivered(env: Env, deal_id: u64) {
        let mut deal = load(&env, deal_id);
        let seller = ship_seller(&env, &deal);
        seller.require_auth();
        if deal.status != Status::Shipped {
            panic_with_error!(&env, Error::WrongStage);
        }
        deal.status = Status::Delivered;
        deal.release_after = env.ledger().timestamp() + GRACE_SECS;
        save(&env, deal_id, &deal);
        Delivered { deal_id, seller, release_after: deal.release_after }.publish(&env);
    }

    /// Ship mode: the buyer went silent for 3 days after delivery. Anyone can pay the seller.
    pub fn claim(env: Env, deal_id: u64) {
        let mut deal = load(&env, deal_id);
        ship_seller(&env, &deal);
        if deal.status != Status::Delivered {
            panic_with_error!(&env, Error::WrongStage);
        }
        if env.ledger().timestamp() < deal.release_after {
            panic_with_error!(&env, Error::TooEarly);
        }
        pay_seller(&env, deal_id, &mut deal);
    }

    /// Ship mode: the buyer opens a problem before the 3 days run out. The money freezes.
    pub fn dispute(env: Env, deal_id: u64) {
        let mut deal = load(&env, deal_id);
        ship_seller(&env, &deal);
        deal.buyer.require_auth();
        if !matches!(deal.status, Status::Shipped | Status::Delivered) {
            panic_with_error!(&env, Error::WrongStage);
        }
        if deal.status == Status::Delivered && env.ledger().timestamp() >= deal.release_after {
            panic_with_error!(&env, Error::TooLate);
        }
        deal.status = Status::Disputed;
        save(&env, deal_id, &deal);
        Disputed { deal_id, buyer: deal.buyer }.publish(&env);
    }

    /// The resolver splits a disputed deal: `to_buyer` back to the buyer, the rest to the seller. Nothing else is possible.
    pub fn resolve(env: Env, deal_id: u64, to_buyer: i128) {
        let mut deal = load(&env, deal_id);
        let seller = ship_seller(&env, &deal);
        let resolver = deal.resolver.clone().unwrap_or_else(|| panic_with_error!(&env, Error::NotAllowed));
        resolver.require_auth();
        if deal.status != Status::Disputed {
            panic_with_error!(&env, Error::WrongStage);
        }
        if to_buyer < 0 || to_buyer > deal.amount {
            panic_with_error!(&env, Error::BadSplit);
        }
        let to_seller = deal.amount - to_buyer;
        deal.status = Status::Resolved;
        save(&env, deal_id, &deal);
        let t = token::Client::new(&env, &deal.token);
        if to_buyer > 0 {
            t.transfer(&env.current_contract_address(), &deal.buyer, &to_buyer);
        }
        if to_seller > 0 {
            t.transfer(&env.current_contract_address(), &seller, &to_seller);
        }
        Resolved { deal_id, resolver, to_buyer, to_seller }.publish(&env);
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
