# Burn

**How does Uniswap's `burn()` make sure that a user can remove liquidity safely — without breaking the `x * y = k` formula, and without tracking how much each user added?**

The answer: a genius math trick.

No storage needed. No user history. Just one clean calculation that figures out exactly how much you should get based on how many LP tokens you send in.

It doesn’t just hand you what you _ask for_ — it gives you exactly what you _own_.  
(Well, to be 100% accurate, it _might_ give you a bit more — if someone transferred LP tokens to the contract without burning them in the same transaction. But that’s an edge case, and it doesn’t hurt the pool. It’s expected that the caller handles this correctly.)

Because your LP tokens represent your share of the pool — and the math makes sure the invariant stays true.

## Walk-through

Liquidity providers (LP) were minted a number LP tokens when they provided liquidity (`mint`), these tokens represent their _share_ of cette UniswapPair.

`Burn` is called in the context of _removing liquidity_. Here LP tokens are used to validate that the amount of tokens the user say they want to remove from the pool, actually **are their's to remove**.

The genius that is Uniswap does not keep track of LP tokens per address. _Let us take this step by step._

---

### Gas savings

Three first lines of code are commented with **gas saving**. _Why is that?_

```solidity
(uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        address _token0 = token0;                                // gas savings
        address _token1 = token1;                                // gas savings
        uint balance0 = IERC20(_token0).balanceOf(address(this));
        uint balance1 = IERC20(_token1).balanceOf(address(this));
        uint liquidity = balanceOf[address(this)];
```

- **GetReserves**: this function fetches the reserves of token0 and token1 set per the last call to \__update_.

---

### Balance vs Reserve

It’s important to distinguish between `reserves` and `balances`.

- `reserves`: The last officially recorded pool state. Updated only when `_update()` is called.
- `balances`: Live token balances, read directly from the ERC20 contracts during the current transaction.

In functions like `burn()` and `mint()`, Uniswap uses `balances` to calculate correct return values **based on the real-time state**, before `_update()` is called.

> `balance0` and `balance1` represent the _future_ reserves,  
> assuming the transaction does not revert.

##### Liquidity

```solidity
uint liquidity = balanceOf[address(this)];
```

This variable does not represent liquidity as in the number of tokens the UniswapPair holds, nay nay, this integer **represents the number of LP tokens to be burned**.

**NB: Who really holds LP tokens?**
LP tokens are owned by liquidity providers. UniswapV2Pair only _mints_ LP tokens, it does not own any itself! **Any tokens sent to this contracts address _balance(this)_ will be BURNED**.

---

### The genius part

```solidity
    uint _totalSupply = totalSupply; // gas savings, must be defined here since totalSupply can update in _mintFee
    amount0 = liquidity.mul(balance0) / _totalSupply; // using balances ensures pro-rata distribution
    amount1 = liquidity.mul(balance1) / _totalSupply; // using balances ensures pro-rata distribution
    require(amount0 > 0 && amount1 > 0, 'UniswapV2: INSUFFICIENT_LIQUIDITY_BURNED');
```
