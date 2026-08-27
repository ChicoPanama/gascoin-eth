// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {BootstrapFeePolicy} from "../../src/BootstrapFeePolicy.sol";

contract BootstrapFeePolicyHarness {
    function fee(uint256 amount, bool isBuy, uint16 pressureBps) external pure returns (uint256) {
        return BootstrapFeePolicy.feeAmount(amount, isBuy, pressureBps);
    }

    function allocation(uint256 amount, bool isBuy, uint16 pressureBps)
        external
        pure
        returns (BootstrapFeePolicy.Allocation memory)
    {
        return BootstrapFeePolicy.allocate(amount, isBuy, pressureBps);
    }
}

contract BootstrapFeePolicyTest {
    BootstrapFeePolicyHarness private immutable policy = new BootstrapFeePolicyHarness();

    function test_LockedExamples() external view {
        require(policy.fee(10_000, true, 0) == 400, "buy fee");
        require(policy.fee(10_000, false, 0) == 500, "sell fee");
        require(policy.fee(10_000, false, 100) == 600, "pressure fee");
        require(policy.fee(10_000, false, 200) == 700, "max fee");

        BootstrapFeePolicy.Allocation memory a = policy.allocation(10_000, false, 200);
        require(a.reserveVault == 450, "reserve");
        require(a.growthLiquidity == 120, "growth/liquidity");
        require(a.teamOperations == 50, "team/ops");
        require(a.defense == 80, "defense");
    }

    function testFuzz_FeeAndAllocationRemainBounded(uint256 rawAmount, uint16 rawPressure) external view {
        uint256 amount = rawAmount % (type(uint256).max / 10_000);
        uint16 pressure = rawPressure % 201;
        uint256 charged = policy.fee(amount, false, pressure);
        BootstrapFeePolicy.Allocation memory a = policy.allocation(amount, false, pressure);
        uint256 allocated = a.reserveVault + a.growthLiquidity + a.distributionReferralGrowth
            + a.teamOperations + a.defense;
        require(charged == allocated, "allocation conservation");
        require(charged <= amount * 700 / 10_000, "sell cap");
        require(a.teamOperations == amount * 50 / 10_000, "pressure cannot reach team");
    }

    function test_PressureOverCapReverts() external {
        (bool ok,) = address(policy).call(abi.encodeCall(policy.fee, (10_000, false, 201)));
        require(!ok, "pressure cap bypass");
    }

    function test_OverflowingAmountFailsClosed() external {
        (bool ok,) = address(policy).call(abi.encodeCall(policy.fee, (type(uint256).max, false, 200)));
        require(!ok, "overflow bound bypass");
    }
}
