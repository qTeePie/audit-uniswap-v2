# Swap

**How does Uniswap's `_update()` make sure that users can swap tokens — without breaking the `x * y = k` formula?**

### Parameters

`_update` takes four parameters. These can be separated into two logical groups:

**Group 1: `balance0` & `balance1`**  
→ These represent the _current token balances_ in the contract, just after a transaction — what the reserves are about to be updated _to_. These are `x1` and `y1`.

**Group 2: `_reserve0` & `_reserve1`**  
→ These are the previous reserve values stored in contract state — the _pre-transaction state_, or `x0` and `y0`.

## Walk-through ♥

This function starts of with a descriptive comment:

> update reserves and, on the first call per block, price accumulators

Since there can be multiple transactions in one block, there can also be multiple calls to Uniswap’s pool within the same block. All these transactions will have the same block.timestamp. To save gas and computing resources, Uniswap only updates the price accumulator once per block — during the first transaction.

This makes the TWAP block-timestamp based. It only tracks price changes between blocks.
Price changes within the same block (from multiple swaps) will affect the pool reserves and the spot price, but will not be reflected in the TWAP. Only the first transaction in a block will contribute to TWAP.
This is an intentional design tradeoff to make the protocol more gas-efficient.

```solidity
function _update(uint balance0, uint balance1, uint112 _reserve0, uint112 _reserve1) private {
    require(balance0 <= uint112(-1) && balance1 <= uint112(-1), 'UniswapV2: OVERFLOW');
    uint32 blockTimestamp = uint32(block.timestamp % 2**32);
    uint32 timeElapsed = blockTimestamp - blockTimestampLast; // overflow is desired
    if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
        // * never overflows, and + overflow is desired
        price0CumulativeLast += uint(UQ112x112.encode(_reserve1).uqdiv(_reserve0)) * timeElapsed;
        price1CumulativeLast += uint(UQ112x112.encode(_reserve0).uqdiv(_reserve1)) * timeElapsed;
    }
    reserve0 = uint112(balance0);
    reserve1 = uint112(balance1);
    blockTimestampLast = blockTimestamp;
    emit Sync(reserve0, reserve1);
}
```

The contract checks that balance0 and balance1 fit within the uint112 range, preventing overflow before storing them in reserve0 and reserve1.

The current tx block's timestamp is then captured and use to calculate TWAP. This is covered in greater detail later.

Contract's storage variables are then updated to reflect the state change post tx. Any subsequent call to `getReserves()` will return the correct quantity for each token.

### TWAP

This way of tracking prices over time — using cumulative price × time — is so storage and gas efficient, it deserves its own document in this repo.

In blockchain, programs don't have the same luxury of "well, it works so it'll do."
Nope. A badly designed protocol, even if secure, will be practically unusable if it’s not optimized for gas and storage.

For every pool state change, eg. updates to its token reserves, `update` is called. First things needed for TWAP is to calculate the time elapsed since last state update, this is done by subtracting the timestamp recorded in last update from the curren block's timestamp.

```solidity
uint32 blockTimestamp = uint32(block.timestamp % 2**32);
uint32 timeElapsed = blockTimestamp - blockTimestampLast;
```
