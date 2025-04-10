import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { IUniswapV2Pair } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

describe("UniswapV2Pair Manual Deployment", () => {
  let token0: Contract;
  let token1: Contract;
  let pair: Contract;

  // Will use factory later, just playing around creating pairs before deep dive
  beforeEach(async () => {
    const [deployer] = await ethers.getSigners();

    const ERC20 = await ethers.getContractFactory("ERC20", deployer);
    token0 = await ERC20.deploy("Token 0", "TK0", 18);
    token1 = await ERC20.deploy("Token 1", "TK1", 18);

    await token0.deployed();
    await token1.deployed();

    const Pair = await ethers.getContractFactory("UniswapV2Pair", deployer);
    pair = await Pair.deploy();
    await pair.deployed();

    await pair.initialize(token0.address, token1.address);
  });

  it("should be initialized with correct tokens", async () => {
    expect(await pair.token0()).to.equal(token0.address);
    expect(await pair.token1()).to.equal(token1.address);
  });
});
