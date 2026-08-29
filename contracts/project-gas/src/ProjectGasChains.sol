// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

/// @notice Canonical Phase 1 execution-chain constants approved by D01.
/// @dev Economic policy must never branch on block.chainid. These constants are
///      for deployment/readback guards and integration tooling only.
library ProjectGasChains {
    uint256 internal constant BASE = 8453;
    uint256 internal constant BASE_SEPOLIA = 84532;

    function isApprovedExecutionChain(uint256 chainId) internal pure returns (bool) {
        return chainId == BASE || chainId == BASE_SEPOLIA;
    }
}

