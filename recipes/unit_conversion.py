from decimal import Decimal

VOLUME_TO_TSP = {'tsp': Decimal(1), 'tbsp': Decimal(3), 'cup': Decimal(48), 'fl_oz': Decimal(6)}
WEIGHT_TO_GRAM = {'g': Decimal(1), 'oz': Decimal('28.3495')}


def convert_amount(amount, from_unit, to_unit):
    """
    Returns `amount` converted from from_unit to to_unit, or None if the two
    units aren't in the same convertible group (e.g. volume vs weight, or a
    non-measurable unit like 'piece'/'can'/'whole' that has no conversion at
    all — those only "convert" when from_unit == to_unit).
    """
    if from_unit == to_unit:
        return amount
    if from_unit in VOLUME_TO_TSP and to_unit in VOLUME_TO_TSP:
        return amount * VOLUME_TO_TSP[from_unit] / VOLUME_TO_TSP[to_unit]
    if from_unit in WEIGHT_TO_GRAM and to_unit in WEIGHT_TO_GRAM:
        return amount * WEIGHT_TO_GRAM[from_unit] / WEIGHT_TO_GRAM[to_unit]
    return None
