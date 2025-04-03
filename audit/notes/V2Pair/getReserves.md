- **GetReserves**: this function fetches the reserves of token0 and token1 set per the last call to \__update_.

---

### Balance vs Reserve

It’s important to distinguish between `reserves` and `balances`.

- `reserves`: The last officially recorded pool state. Updated only when `_update()` is called.
- `balances`: Live token balances, read directly from the ERC20 contracts during the current transaction.

In functions like `burn()` and `mint()`, Uniswap uses `balances` to calculate correct return values **based on the real-time state**, before `_update()` is called.

> `balance0` and `balance1` represent the _future_ reserves,  
> assuming the transaction does not revert.
