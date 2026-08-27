// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

/// @notice Canonical router fee mathematics for the approved bootstrap policy.
/// @dev This library is not called by GAS transfers and cannot create a
/// fee-on-transfer token. Router implementations must bind the returned fee to
/// an expiring quote and enforce intent idempotency.
library BootstrapFeePolicy {
    uint16 internal constant BUY_BASE_FEE_BPS = 400;
    uint16 internal constant SELL_BASE_FEE_BPS = 500;
    uint16 internal constant MAX_PRESSURE_FEE_BPS = 200;
    uint16 internal constant MAX_SELL_FEE_BPS = 700;
    uint16 internal constant BPS = 10_000;
    uint256 internal constant MAX_ROUTABLE_AMOUNT = type(uint256).max / BPS;

    error PressureFeeOutOfBounds();
    error AmountOutOfBounds();

    struct Allocation {
        uint256 reserveVault;
        uint256 growthLiquidity;
        uint256 distributionReferralGrowth;
        uint256 teamOperations;
        uint256 defense;
    }

    function feeBps(bool isBuy, uint16 pressureFeeBps) internal pure returns (uint16) {
        if (isBuy) {
            if (pressureFeeBps != 0) revert PressureFeeOutOfBounds();
            return BUY_BASE_FEE_BPS;
        }
        if (pressureFeeBps > MAX_PRESSURE_FEE_BPS) revert PressureFeeOutOfBounds();
        return SELL_BASE_FEE_BPS + pressureFeeBps;
    }

    function feeAmount(uint256 amount, bool isBuy, uint16 pressureFeeBps) internal pure returns (uint256) {
        if (amount > MAX_ROUTABLE_AMOUNT) revert AmountOutOfBounds();
        return amount * feeBps(isBuy, pressureFeeBps) / BPS;
    }

    function allocate(uint256 amount, bool isBuy, uint16 pressureFeeBps)
        internal
        pure
        returns (Allocation memory allocation)
    {
        uint256 total = feeAmount(amount, isBuy, pressureFeeBps);
        if (isBuy) {
            allocation.reserveVault = amount * 200 / BPS;
            allocation.growthLiquidity = amount * 75 / BPS;
            allocation.distributionReferralGrowth = amount * 50 / BPS;
            allocation.teamOperations = amount * 50 / BPS;
            allocation.defense = amount * 25 / BPS;
        } else {
            uint256 pressure = amount * pressureFeeBps / BPS;
            allocation.reserveVault = amount * 300 / BPS + pressure * 75 / 100;
            allocation.growthLiquidity = amount * 100 / BPS + pressure * 10 / 100;
            allocation.teamOperations = amount * 50 / BPS;
            allocation.defense = amount * 50 / BPS + pressure * 15 / 100;
        }

        uint256 allocated = allocation.reserveVault + allocation.growthLiquidity
            + allocation.distributionReferralGrowth + allocation.teamOperations + allocation.defense;
        // Reserve-first deterministic dust policy makes allocation conservation exact.
        allocation.reserveVault += total - allocated;
    }
}
