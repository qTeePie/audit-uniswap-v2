# 🔥 Function Deep Dive: `burn()` — UniswapV2Pair

## ✨ Overview

The `burn()` function allows LPs to redeem their share of the pool by burning their LP tokens in exchange for token0 and token1. It's a core mechanic in the lifecycle of providing and withdrawing liquidity in Uniswap V2.

---

## 🧠 Step-by-Step Breakdown

### 1. 🔍 Read balances directly from the ERC20 tokens

```solidity
uint balance0 = IERC20(_token0).balanceOf(address(this));
uint balance1 = IERC20(_token1).balanceOf(address(this));
uint liquidity = balanceOf[address(this)];
```

- `balance0` & `balance1` are **live balances** of token0 and token1.
- These are more accurate than `_reserve0/_reserve1` because tokens could have been sent directly to the contract.
- `liquidity` = amount of LP tokens the user has sent to the contract to redeem.

---

### 2. 🧾 Trigger `_mintFee()`

```solidity
bool feeOn = _mintFee(_reserve0, _reserve1);
```

- This checks whether fees are on (based on `feeTo` address)
- If they are, it may mint a small number of LP tokens to the protocol as a fee
- We'll dive into `_mintFee()` later 🧪

---

### 3. 📐 Calculate how much token0 and token1 the user should get

```solidity
uint _totalSupply = totalSupply;
amount0 = liquidity.mul(balance0) / _totalSupply;
amount1 = liquidity.mul(balance1) / _totalSupply;
```

- This uses **pro-rata math**: "You get the same percentage of tokens as the % of LP tokens you're burning."
- LP tokens = shares of the pool.
- `balance0` and `balance1` are used instead of `_reserve0` because they reflect **actual current state**.
- This prevents potential issues where someone added tokens without syncing.

---

## 💭 Thoughts 💙😈

- LP tokens are like **stocks** of the pool — the more you have, the more share you own.
- `amount0` and `amount1` represent your **exit payout** from the pool, and they scale linearly based on your LP token share.
- Using `balance0/balance1` (instead of `_reserve0/_reserve1`) ensures the math is **fair and accurate**, even if someone sent tokens directly into the pair.
- This burn logic is **clean af**, and super important to understand if you want to know what really happens when you withdraw liquidity.

Next up: the actual **burning + transfer** step and how `kLast` gets updated 🧪🔥
