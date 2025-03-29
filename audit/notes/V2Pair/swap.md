# Swap

**How does Uniswap's `swao()` make sure that users can swap tokens — without breaking the `x * y = k` formula?**

## Walk-through ♥

### Parameters

`Swap`accepts four parameters.

```solidity
function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data)
```

1. **amount0Out** ­— if user wants to _swap token1 in exchange for token0_, this parameter will be > 0
1. **amount1Out** ­— if user wants to _swap token0 in exchange for token1_, this parameter will be > 0
