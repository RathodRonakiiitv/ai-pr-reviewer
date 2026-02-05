"""
Additional sample functions with some intentional issues for the AI to catch.
Use this file to test how the AI reviewer identifies problems.
"""

import math


def calculate_area(radius):
    # Missing type hints - AI might suggest adding them
    return 3.14 * radius * radius  # Could use math.pi instead


def power(base, exponent):
    """Calculate base raised to exponent."""
    # Simple implementation - could use ** operator or math.pow
    result = 1
    for i in range(exponent):
        result *= base
    return result


def square_root(n):
    """Calculate square root of n."""
    # No validation for negative numbers
    return math.sqrt(n)


def factorial(n):
    """Calculate factorial of n."""
    if n == 0:
        return 1
    return n * factorial(n - 1)  # No check for negative input


def is_prime(n):
    """Check if n is prime."""
    if n < 2:
        return False
    for i in range(2, n):  # Inefficient - could stop at sqrt(n)
        if n % i == 0:
            return False
    return True


def find_max(numbers):
    """Find maximum value in a list."""
    # No handling for empty list
    max_val = numbers[0]
    for num in numbers:
        if num > max_val:
            max_val = num
    return max_val


if __name__ == "__main__":
    print(f"Area of circle with radius 5: {calculate_area(5)}")
    print(f"2^10 = {power(2, 10)}")
    print(f"Square root of 16: {square_root(16)}")
    print(f"5! = {factorial(5)}")
    print(f"Is 17 prime? {is_prime(17)}")
    print(f"Max of [3, 1, 4, 1, 5, 9]: {find_max([3, 1, 4, 1, 5, 9])}")
