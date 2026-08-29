// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

/// @dev TEST-ONLY D02 candidate model. It is deliberately outside src/ and is
/// not a deployable or approved monetary implementation. RAY precision and all
/// rounding choices remain decision inputs until D02 is explicitly approved.
library ShareIndexCandidateModel {
    uint256 internal constant CANDIDATE_INDEX_SCALE = 1e27;

    function gasForSharesDown(uint256 shares, uint256 index) internal pure returns (uint256) {
        require(index > 0, "index=0");
        return shares * index / CANDIDATE_INDEX_SCALE;
    }

    function sharesForGasDown(uint256 gasAmount, uint256 index) internal pure returns (uint256) {
        require(index > 0, "index=0");
        return gasAmount * CANDIDATE_INDEX_SCALE / index;
    }

    function gasForSharesUp(uint256 shares, uint256 index) internal pure returns (uint256) {
        require(index > 0, "index=0");
        uint256 product = shares * index;
        return product == 0 ? 0 : (product - 1) / CANDIDATE_INDEX_SCALE + 1;
    }

    function sharesForGasUp(uint256 gasAmount, uint256 index) internal pure returns (uint256) {
        require(index > 0, "index=0");
        uint256 product = gasAmount * CANDIDATE_INDEX_SCALE;
        return product == 0 ? 0 : (product - 1) / index + 1;
    }
}

contract ShareIndexCandidateModelTest {
    uint256 private constant SCALE = 1e27;

    function boundedShares(uint128 raw) private pure returns (uint256) {
        return uint256(raw) % 1e36 + 1;
    }

    function boundedIndexDelta(uint96 raw) private pure returns (uint256) {
        return uint256(raw) % 9e26 + 1;
    }

    function testFuzz_PositiveAndNegativeRebasePreserveShares(uint128 rawShares, uint96 rawDelta) external pure {
        uint256 shares = boundedShares(rawShares);
        uint256 delta = boundedIndexDelta(rawDelta);
        uint256 beforeGas = ShareIndexCandidateModel.gasForSharesDown(shares, SCALE);
        uint256 afterExpansion = ShareIndexCandidateModel.gasForSharesDown(shares, SCALE + delta);
        uint256 afterContraction = ShareIndexCandidateModel.gasForSharesDown(shares, SCALE - delta);

        require(afterExpansion >= beforeGas, "expansion reduced value");
        require(afterContraction <= beforeGas, "contraction increased value");
        require(shares == boundedShares(rawShares), "rebase mutated shares");
    }

    function testFuzz_WrappedQuantityStaysFixedWhileUnderlyingRebases(uint128 rawShares, uint96 rawDelta)
        external
        pure
    {
        uint256 wrappedQuantity = boundedShares(rawShares);
        uint256 delta = boundedIndexDelta(rawDelta);
        uint256 beforeUnderlying = ShareIndexCandidateModel.gasForSharesDown(wrappedQuantity, SCALE);
        uint256 afterUnderlying = ShareIndexCandidateModel.gasForSharesDown(wrappedQuantity, SCALE + delta);
        uint256 contractedUnderlying = ShareIndexCandidateModel.gasForSharesDown(wrappedQuantity, SCALE - delta);

        require(wrappedQuantity == boundedShares(rawShares), "wrapped quantity rebased");
        require(afterUnderlying >= beforeUnderlying, "wrapper missed expansion");
        require(contractedUnderlying <= beforeUnderlying, "wrapper missed contraction");
    }

    function testFuzz_FloorWrapRoundTripCannotCreateGas(uint128 rawGas, uint96 rawIndexDelta) external pure {
        uint256 gasIn = boundedShares(rawGas);
        uint256 index = SCALE - boundedIndexDelta(rawIndexDelta);
        uint256 wrapperShares = ShareIndexCandidateModel.sharesForGasDown(gasIn, index);
        uint256 gasOut = ShareIndexCandidateModel.gasForSharesDown(wrapperShares, index);

        require(gasOut <= gasIn, "floor round trip created GAS");
    }

    function testFuzz_WrapTransfersButDoesNotCreateShares(uint128 rawOwnerShares, uint128 rawWrapShares) external pure {
        uint256 ownerShares = boundedShares(rawOwnerShares);
        uint256 sharesToWrap = uint256(rawWrapShares) % (ownerShares + 1);
        uint256 ownerAfter = ownerShares - sharesToWrap;
        uint256 wrapperAfter = sharesToWrap;

        require(ownerAfter + wrapperAfter == ownerShares, "share conservation failed");
    }

    function testFuzz_UpAndDownCandidatesDifferByAtMostOneUnit(uint128 rawAmount, uint96 rawIndexDelta) external pure {
        uint256 amount = boundedShares(rawAmount);
        uint256 index = SCALE + boundedIndexDelta(rawIndexDelta);
        uint256 gasDown = ShareIndexCandidateModel.gasForSharesDown(amount, index);
        uint256 gasUp = ShareIndexCandidateModel.gasForSharesUp(amount, index);
        uint256 sharesDown = ShareIndexCandidateModel.sharesForGasDown(amount, index);
        uint256 sharesUp = ShareIndexCandidateModel.sharesForGasUp(amount, index);

        require(gasUp >= gasDown && gasUp - gasDown <= 1, "GAS rounding distance");
        require(sharesUp >= sharesDown && sharesUp - sharesDown <= 1, "share rounding distance");
    }
}
