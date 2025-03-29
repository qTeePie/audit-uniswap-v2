# Burn

**How does Uniswap's `burn()` make sure that a user can remove liquidity safely — without breaking the `x * y = k` formula, and without tracking how much each user added?**

The answer: a genius math trick.

No storage needed. No user history. Just one clean calculation that figures out exactly how much you should get based on how many LP tokens you send in.

It doesn’t just hand you what you _ask for_ — it gives you exactly what you _own_.  
(Well, to be 100% accurate, it _might_ give you a bit more — if someone transferred LP tokens to the contract without burning them in the same transaction. But that’s an edge case, and it doesn’t hurt the pool. It’s expected that the caller handles this correctly.)

Because your LP tokens represent your share of the pool — and the math makes sure the invariant stays true.

## Walk-through

Liquidity providers (LP) were minted a number LP tokens when they provided liquidity (`mint`), these tokens represent their _share_ of cette UniswapPair.

`Burn` is used when a user wants to remove liquidity from the pool.
The amount of LP tokens the Pair contract holds at that moment is what determines how much liquidity will be removed — it’s not about validating ownership, but simply burning however many LP tokens were sent to the contract.
The user controls how much liquidity they remove by sending in LP tokens — the contract just follows the math.

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

**Who holds LP tokens?**
LP tokens are owned by liquidity providers. UniswapV2Pair only _mints_ LP tokens, it does not own any itself!

**Any tokens sent to this contracts address _balance(this)_ will be BURNED**.

> _LP tokens aren’t auto-burned when sent —they just sit there until someone (usually the sender) calls burn(), and then Uniswap calculates how much token0/token1 they’re owed based on those LP tokens currently sitting at the contract._

The variable `liquidity` was _supposed_ to be `L` in the formula **x \* y = L²**,  
but since Uniswap integrated this clever mechanism to punish uneven liquidity addition (in the `mint()` function):

```solidity
liquidity = Math.min(
  amount0.mul(_totalSupply) / _reserve0,
  amount1.mul(_totalSupply) / _reserve1
);
```

Because of this, the supply of LP (liquidity) ≠ `√(x * y)`.  
This symmetry break happens after the **first** mint.

During the initial mint (`_totalSupply == 0`), Uniswap uses:

```solidity
liquidity = Math.sqrt(amount0.mul(amount1)).sub(MINIMUM_LIQUIDITY);
_mint(address(0), MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens
```

But once `totalSupply > 0`, it switches to:

```solidity
liquidity = Math.min(
  amount0.mul(_totalSupply) / _reserve0,
  amount1.mul(_totalSupply) / _reserve1
);
```

💡 So the clean `√(x * y)` logic only applies **once** — at genesis.  
After that, LP supply stops being symmetric and becomes **ratio-protected**, the ratio of LP tokens burned vs LP totalSupply works as the validator when removing liquidity.

The ratio works as the mathematical validator when removing liquidity.
**This ratio ensures the correct amount of tokens are transferred to the calling user for the invariant _x \* y = k_ to stay true**. No need to track _who_ owns what.

_Below we will go deeper into the genius of Uniswap._

---

### The genius of Uniswap reflected in `Burn()`

This little math block below is why Uniswap doesn’t bother storing who added what.
No mappings, no user history — it just looks at how many LP tokens you’re burning, checks the current pool balances, and says:
"Here’s your share, babe. Math don’t lie."
That’s the whole trick.
You don’t need to be remembered. The math remembers.

```solidity
    uint _totalSupply = totalSupply; // gas savings, must be defined here since totalSupply can update in _mintFee
    amount0 = liquidity.mul(balance0) / _totalSupply; // using balances ensures pro-rata distribution
    amount1 = liquidity.mul(balance1) / _totalSupply; // using balances ensures pro-rata distribution
    require(amount0 > 0 && amount1 > 0, 'UniswapV2: INSUFFICIENT_LIQUIDITY_BURNED');
```

To anyone who is unsure "where does the liquidity come from, what even is this!?". Read the code below. What happens in the very beginning of `Burn`, before any transaction of token0 / token1:

**There has been sent LP tokens to UniswapV2Pair.sol, these LP tokens are sent to UniswapV2Pair contract in the same transaction as `Burn` (removing liquidity from pool).**

```solidity
   uint liquidity = balanceOf[address(this)];
```

**But wait — where does that "liquidity" even come from? Who decides how much you can remove?!**

Well… right at the start of `burn()`, before anything else happens, the contract literally checks how many LP tokens it’s holding:

```solidity
uint liquidity = balanceOf[address(this)];
```

What’s happening here?  
**The user has already sent their LP tokens to the Pair contract (usually in the same transaction) and then calls `burn()`.**  
This line is the contract saying:  
_"Okay, let me check how much liquidity someone is trying to burn. Did they actually send me those LP tokens, or are they trying to play me?"_  
It’s a simple, savage check.  
**If you didn’t send LP tokens, you get nothing.  
If you did, math will hand you your pro-rata share. No questions asked.**

---

So anyways, back to the point, back to the math trick, and no re-circling this time, I promise.

```solidity
    uint _totalSupply = totalSupply; // gas savings, must be defined here since totalSupply can update in _mintFee
    // 1, 2, 3
    amount0 = liquidity.mul(balance0) / _totalSupply; // using balances ensures pro-rata distribution
    amount1 = liquidity.mul(balance1) / _totalSupply; // using balances ensures pro-rata distribution
    require(amount0 > 0 && amount1 > 0, 'UniswapV2: INSUFFICIENT_LIQUIDITY_BURNED');
```

1. Take the liquidity sent to UniswapV2Pair (these (should lol) have been sent in the same tx as our `burn`),
2. Multiply this with balance0/1 (the freshly feched balance of token0 as per token0/1 ERC20 contract)
3. Divide the answer with totalSupply of LP tokens minted

If the result of the above step is less than
