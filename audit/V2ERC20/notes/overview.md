# V2ERC20

This contract handles LP (liquidity provider) tokens, an ERC20 that implements the standard mint and burn functions. LP tokens' utility is their role in how Uniswap calculates liquidity shares in a pool, think of a pool like a cake, how many LP tokens a user has is their cake piece.

### \_mint

Happens when _liquidity is added_.

### \_burn

Happens when _liquidity is removed_.

**Every interaction that involves add / removal of liquidity interacts with this contract.**
**\_mint() and \_burn() are internal because: They should only be called when the contract has already done all the sanity checks.**
**In this case, these checks are done in V2Pair contract, which implements this ERC20 (giving it access to internal functions).**
