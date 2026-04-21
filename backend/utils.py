from __future__ import annotations

from fractions import Fraction
from math import gcd
from typing import Dict, Iterable


ZERO = Fraction(0, 1)
ONE = Fraction(1, 1)


def frac(numerator: int, denominator: int = 1) -> Fraction:
    if denominator == 0:
        raise ValueError("Penyebut tidak boleh nol.")
    return Fraction(numerator, denominator)


def lcm(a: int, b: int) -> int:
    if not a or not b:
        return 0
    return abs(a * b) // gcd(a, b)


def lcm_many(values: Iterable[int]) -> int:
    result = 0
    for value in values:
        if not value:
            continue
        result = value if result == 0 else lcm(result, value)
    return result


def sum_fractions(values: Iterable[Fraction]) -> Fraction:
    total = ZERO
    for value in values:
        total += value
    return total


def fraction_to_text(value: Fraction) -> str:
    if value == 0:
        return "0"
    if value.denominator == 1:
        return str(value.numerator)
    return f"{value.numerator}/{value.denominator}"


def distribute_share_by_weight(
    total_share: Fraction,
    items: Iterable[tuple[str, int, int]],
) -> Dict[str, Fraction]:
    active_items = [(key, count, weight) for key, count, weight in items if count > 0]
    total_weight = sum(count * weight for _, count, weight in active_items)
    if total_share <= 0 or total_weight == 0:
        return {}

    result: Dict[str, Fraction] = {}
    for key, count, weight in active_items:
        result[key] = total_share * Fraction(count * weight, total_weight)
    return result


def compute_tashih_base(shares: Dict[str, Fraction], counts: Dict[str, int]) -> int:
    denominators = [share.denominator for share in shares.values() if share > 0]
    base = lcm_many(denominators) or 1
    multiplier = 1

    for key, share in shares.items():
        if share <= 0:
            continue
        raw_saham = int(base * share)
        count = max(counts.get(key, 1), 1)
        needed = count // gcd(raw_saham, count)
        multiplier = lcm(multiplier, needed) if needed > 1 else multiplier

    return base * multiplier


def money(value: float) -> float:
    return round(value, 2)
