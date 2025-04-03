`Swap` and `Burn` functions in `UniswapV2Pair.sol` plays a central role in the quiet logic that is Uniswap V2.

`Swap` handles the core trading mechanism: allowing users to exchange tokens while preserving the constant product formula:

> **Invariant: x × y = k**

These are some of my notes while reverse-engineering this function.

### Modifiers

#### Reentrancy & Lock

The `lock` modifier in `UniswapV2Pair.sol` acts similarly to a `mutex_lock` in multi-threaded applications.  
While Solidity is single-threaded by design, external calls (like token transfers) can still introduce reentrancy vulnerabilities.

This modifier prevents reentrancy by ensuring that no function wrapped in `lock` can be entered again before the previous execution finishes.  
It uses a simple state flag (`unlocked`) that temporarily locks the contract during execution and resets it after.

In Uniswap V2, it's used as a protective wrapper around critical state-changing functions like `swap()`, `mint()`, and `burn()` — all involve token transfers and reserve updates.

> **Reentrancy is not about threads. It’s about control.**  
> `lock` ensures Uniswap always finishes what it started — before anything tries to sneak back in.

```solidity
modifier lock() {
    require(unlocked == 1, 'UniswapV2: LOCKED');
    unlocked = 0;
    _;
    unlocked = 1;
}
```

This lock is added to `swap`and `burn`. _Why is that?_.`Lock` prevents a function to be reentered. When is it crucial that a function is not to be reentered?

**When there are external calls to other contracts, such as (but not limited to) token transfers.**

**Burn ( )**

```solidity
    (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        address _token0 = token0;                                // gas savings
        address _token1 = token1;                                // gas savings
        uint balance0 = IERC20(_token0).balanceOf(address(this));
        uint balance1 = IERC20(_token1).balanceOf(address(this));
        uint liquidity = balanceOf[address(this)];
```
