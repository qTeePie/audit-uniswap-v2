### ❗️Uneven Liquidity Provision — You _Will_ Lose Tokens

When adding liquidity in Uniswap V2, the amount of LP tokens you receive is calculated based on the **smaller side** of your token contribution:

```solidity
liquidity = Math.min(
    amount0.mul(_totalSupply) / _reserve0,
    amount1.mul(_totalSupply) / _reserve1
);
```

**If you send in tokens unevenly (e.g., 70% ETH, 30% DAI in a 50/50 pool), the contract will mint LP tokens based on the smaller contribution (DAI in this case).  
Any excess tokens (the extra ETH) will not be counted toward your LP tokens.**

→ **The contract will not refund the extra tokens.  
→ They will stay in the Pair contract.  
→ You can only get them back if you manually call `transfer()` or another withdrawal function yourself.**

Most frontends (like app.uniswap.org) will protect you from this by calculating the ratio and refunding the extra tokens —  
**but if you interact directly with the Pair contract, you can lose tokens by adding liquidity unevenly.**

**Uniswap doesn't rebalance for you.  
The math is cold.  
You either match the pool ratio, or you lose.**
