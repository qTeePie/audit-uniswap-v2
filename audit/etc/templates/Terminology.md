# 🧠 Terminology

- **LP Tokens**: Represent your share of the liquidity pool
- **Reserves vs Balances**: `reserves` are stored values, `balances` are live token holdings
- **kLast**: Tracks last value of reserve0 * reserve1 for fee calculations
- **feeOn**: Indicates if protocol fee should be minted
- **min()**: Used in mint to prevent LP ratio imbalance
