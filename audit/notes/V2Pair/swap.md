# Swap

**How does Uniswap's `swap()` make sure that users can swap tokens — without breaking the `x * y = k` formula?**

## Walk-through ♥

### Parameters

`Swap`accepts four parameters.

```solidity
function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data)
```

1. **amount0Out** ­— if user wants to _swap token1 in exchange for token0_, this parameter will be > 0
2. **amount1Out** ­— if user wants to _swap token0 in exchange for token1_, this parameter will be > 0
3. **to** ­— this is the recipient of the output tokens from swap.
4. **calldata** ­— this is any additional data that the calling account / contract wants to include in the swap. Used for flash swaps.

**Flash Swaps ­are swaps were you borrow tokens and repay them in the same tx. If the calldata parameter is not null, the v2Pair will initialize a Uniwswap v2Call.**

## Walk-through ♥

```solidity
function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external lock {
        require(amount0Out > 0 || amount1Out > 0, 'UniswapV2: INSUFFICIENT_OUTPUT_AMOUNT');
        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        require(amount0Out < _reserve0 && amount1Out < _reserve1, 'UniswapV2: INSUFFICIENT_LIQUIDITY');

        uint balance0;
        uint balance1;
        { // scope for _token{0,1}, avoids stack too deep errors
        address _token0 = token0;
        address _token1 = token1;
        ...
}
```

Swap starts of with some requires which checks that either (or both) amount0Out or amount1Out is more than 0.

**AmountOut** represents the amount of tokens want to get OUT of the pool, it is the _dy_ in regards to the invariant **y in x\*y=k**.
Either of these to parameters (0/1) needs to be over 0, cause there needs to be some sort of withdrawal of tokens from the pool for the `swap` to happen.

Following this, the contract calls getReserves(), which retrieves the last updated reserves of token0 and token1 (these are set in the `_update` on pool state changes).

- **GetReserves**: this function fetches the reserves of token0 and token1 set per the last call to \__update_.

Then the contract checks the defined amountOut is not larger than the actual reserves in pool (if y = 500, caller cannot swap for y = 501).

Then four variables are initialized, balance0/1 and token0/1. These will hold values necessery for our calculations.

### Core Math

This next block of code is where the magic happens. `Swap` is the core of uniswapv2. In order to understsand Uniswap, these next few lines are essential.

```solidity
{ // scope for _token{0,1}, avoids stack too deep errors
    address _token0 = token0;
    address _token1 = token1;
    require(to != _token0 && to != _token1, 'UniswapV2: INVALID_TO');
    if (amount0Out > 0) _safeTransfer(_token0, to, amount0Out); // optimistically transfer tokens
    if (amount1Out > 0) _safeTransfer(_token1, to, amount1Out); // optimistically transfer tokens
    if (data.length > 0) IUniswapV2Callee(to).uniswapV2Call(msg.sender, amount0Out, amount1Out, data);
    balance0 = IERC20(_token0).balanceOf(address(this));
    balance1 = IERC20(_token1).balanceOf(address(this));
}

```

Before visiting the genius Uniswap trickster math, there is one last check:

```solidity
require(to != _token0 && to != _token1, 'UniswapV2: INVALID_TO');
```

**NB:** Checking that the address to whom we will send whatever value calculated for our y so that x\*y=k isNot equal to the ERC20 contract address of the tokens in cette liquidity pool.

eg. If the caller wants to withdraw DAI tokens in a ETH/DAI pool, they cannot specify _to_ parameter as the address of DAI.

**WHY??**
Will write some tests on this, but initial thought is avoiding weird ERC20 tokens (either weird by design or malicious).

Uniswap then transfers the token amountOut(s) to the speficied address. If there is any calldata provided in parameter, eg. if this call is a _flash swap_, the flash functionality executes now.

**Quick: UniswapV2Callee**

If data parameter is not null, it signals the caller wish to flash swap. Callers who wish to flash swap are expected to implement the interface _UniswapV2Callee_ and implement the function _uniswapV2Call_, where one specifies actions for the flash swap.

Then the new balances of each token post the transfers are fetched directly from their respective ERC20 contracts and stored in variables `balance0` for token0 and `balance1` for token1.

**To upheld the Uniswap invariant of x\*y=k, these balances multiplied have to be equal to K. With other words, they have to be equal to reserve0 \* reserve1, or:** **_x1 \* y1 ≥ x0 \* x1._**

In the above equation, which values do we need? We already know:

- x0 => \_reserve0
- y0 => \_reserve1
- x1 => \_balance0
- y1 => \_balance1

There is a fee involved here, so we need to kknow _dx_! Cause we need to calculate the fee before asserting that our invariant is held true.

```solidity
    ...
    uint amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
    uint amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
    ...
```

Fee is the calculated:

```solidity
    uint balance0Adjusted = balance0.mul(1000).sub(amount0In.mul(3));
    uint balance1Adjusted = balance1.mul(1000).sub(amount1In.mul(3));
```

> NB: Since solidity does not deal with floats, balance0/1 are multiplied with 1000, this way the 0.3 fee can be calculated and subtracted from _x1_ without the use of floats. The fee needs to be sutracted from _dx_ (amountIn).
> This is why you see reserve0/1 being multiplied with 100\*\*2 (1mill).

> **NB:** Since Solidity doesn’t deal with floats, the contract multiplies the balances by `1000` and subtracts the incoming amount times `3`. This is how the 0.3% fee is applied without using decimals (since 3 / 1000 = 0.003 = 0.3%).  
> So what you’re actually seeing here is that the balances are scaled temporarily in the calculation — not the reserves themselves — to apply the fee math.  
> That’s why you’ll see something like:
>
> ```solidity
> balance0Adjusted = balance0 * 1000 - amount0In * 3;
> balance1Adjusted = balance1 * 1000 - amount1In * 3;
> ```
>
> This adjusted balance math makes sure that when the invariant check happens (x1 \* y1 ≥ x0 \* y0), it also accounts for the fee deduction — so liquidity providers are guaranteed to earn their 0.3%.

Since there has been a pool state change, next up is calling `_update`, updating the pool's reserves, and emit a Swap event.
