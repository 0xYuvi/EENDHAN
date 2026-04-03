from collections.abc import Iterator

import pytest
from algopy_testing import AlgopyTestContext, algopy_testing_context

from smart_contracts.eendhan.contract import (
    Eendhan,
    PLATFORM_FEE_BASIS_POINTS,
    USDC_ASSET_ID,
)


@pytest.fixture()
def context() -> Iterator[AlgopyTestContext]:
    with algopy_testing_context() as ctx:
        yield ctx


def test_create_initializes_contract(context: AlgopyTestContext) -> None:
    # Arrange
    treasury = context.any.account()
    creator = context.any.account()
    contract = Eendhan()

    # Act
    contract.create(treasury, creator)

    # Assert
    assert contract.treasury_address == treasury
    assert contract.creator_address == creator
    assert contract.usdc_asset.id == USDC_ASSET_ID


def test_get_treasury_returns_address(context: AlgopyTestContext) -> None:
    # Arrange
    treasury = context.any.account()
    creator = context.any.account()
    contract = Eendhan()
    contract.create(treasury, creator)

    # Act
    result = contract.get_treasury()

    # Assert
    assert result == treasury


def test_get_creator_returns_address(context: AlgopyTestContext) -> None:
    # Arrange
    treasury = context.any.account()
    creator = context.any.account()
    contract = Eendhan()
    contract.create(treasury, creator)

    # Act
    result = contract.get_creator()

    # Assert
    assert result == creator


def test_platform_fee_basis_points_constant(context: AlgopyTestContext) -> None:
    assert PLATFORM_FEE_BASIS_POINTS == 500
