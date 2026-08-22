// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {ProjectGasChains} from "../../src/ProjectGasChains.sol";

contract ProjectGasChainsTest {
    function test_BaseIsCanonicalExecutionChain() external pure {
        require(ProjectGasChains.isApprovedExecutionChain(8453), "Base must be approved");
    }

    function test_BaseSepoliaIsCanonicalIntegrationTestnet() external pure {
        require(ProjectGasChains.isApprovedExecutionChain(84532), "Base Sepolia must be approved");
    }

    function test_OtherChainsAreNotProjectGasExecutionChains() external pure {
        require(!ProjectGasChains.isApprovedExecutionChain(1), "Ethereum L1 cannot execute Phase 1");
        require(!ProjectGasChains.isApprovedExecutionChain(46630), "Robinhood cannot execute Phase 1");
        require(!ProjectGasChains.isApprovedExecutionChain(31337), "Anvil is test-only");
    }
}

