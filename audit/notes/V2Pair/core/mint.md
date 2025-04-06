# Mint

**How does Uniswap's `mint()` make sure that users can swap tokens — without breaking the `x * y = k` formula?**

### Visibility

The function is external, eg. it can only be called outside the contract. _It is an entry point_, called in the context of _adding liquidity_ to the pool.

### Parameters

`mint` takes a single parameter
&rarr; the address which the minted LP tokens will be sent to.

## Walk-through ♥

The function starts of fetching the current reserves of token0/1 by calling `getReserves`.

```solidity
    function mint(address to) external lock returns (uint liquidity) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves(); // gas savings
        uint balance0 = IERC20(token0).balanceOf(address(this));
        uint balance1 = IERC20(token1).balanceOf(address(this));
        uint amount0 = balance0.sub(_reserve0); //dx
        uint amount1 = balance1.sub(_reserve1); //dy
        ...
```

So… why does it fetch reserves and call each token's balanceOf()?
Aren’t those basically the same values?
&rarr; No:

The user has already **sent tokens to the pool** before calling `mint()` (this needs to be in the same transaction cuz if not, those LP tokens are going to whoever calls `mint` lol)

`mint` is simply calculating what was added since last state update. The added tokens, _dx_ and _dy_. These values are stored in variables `amount0` and `amount1`.

```solidity
...
bool feeOn = _mintFee(_reserve0, _reserve1);
uint _totalSupply = totalSupply; // gas savings, must be defined here since totalSupply can update in _mintFee
if (_totalSupply == 0) {
    liquidity = Math.sqrt(amount0.mul(amount1)).sub(MINIMUM_LIQUIDITY);
    _mint(address(0), MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens
} else {
    liquidity = Math.min(amount0.mul(_totalSupply) / _reserve0, amount1.mul(_totalSupply) / _reserve1);
}
...
```

`FeeOn` is set by the factory when pool is created. Fee details are ccovered in a seperate note _mintFee.md_.

Lets cover the variables we deal with, cause the next part is the core of `mint()`, so understanding each variable here is important.

- `\_totalSupply`: The total supply of LP tokens, these tokens represents a caller's share of the pool. When adding liquidity, the totalSupply increases (mint), when removing liquidity, the totalsupply decreases (burns).
- `liquidity`:

If LPTOKENS are 0, then amount0 and amount1 are the first tokens added, and therefore they're not only dx and dy, they are also x and y! When the pool goes from empty to achieving MINIMUM_LIQUIDITY, `x * y = L^2`. The code below is this equation written in Solidity:

**L = sqrt(x \* y) - MINIMUM_LIQUIDITY**

The contract subtracts the defined minimum_liquidity from the liquidity (LP tokens) that will be minted to whatever address is passed as `to` parameter and sends them to address(0), meaning they are sent into the void and locked forever.

```solidity
if (_totalSupply == 0) {
    liquidity = Math.sqrt(amount0.mul(amount1)).sub(MINIMUM_LIQUIDITY);
    _mint(address(0), MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens
}
...
```

I gotta say tho, that is unhinged if the first liquidity provider is unaware and just loses out on tokens with 0 reward. Very naughty. Could at least have minted them some custom "Where did my tokens go!?" NFT.

What I find somewhat funny is, these

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
