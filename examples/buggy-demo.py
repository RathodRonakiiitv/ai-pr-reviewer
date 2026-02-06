"""
Demo file with intentional bugs for AI PR Reviewer to catch.
This demonstrates the power of AI-assisted code review!
"""

import os
import subprocess

# BUG 1: SQL Injection vulnerability
def get_user(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"  # BAD: SQL injection!
    return execute_query(query)


# BUG 2: Hardcoded credentials (security issue)
API_KEY = "sk-1234567890abcdef"
DATABASE_PASSWORD = "admin123"


# BUG 3: Division by zero risk
def calculate_average(numbers):
    total = sum(numbers)
    return total / len(numbers)  # BAD: No check for empty list!


# BUG 4: Resource leak - file not closed
def read_config(filepath):
    f = open(filepath, 'r')  # BAD: Should use 'with' statement
    data = f.read()
    return data


# BUG 5: Command injection vulnerability
def run_user_command(user_input):
    subprocess.call(user_input, shell=True)  # BAD: Command injection!


# BUG 6: Race condition potential
counter = 0

def increment():
    global counter
    temp = counter  # BAD: Not thread-safe
    temp += 1
    counter = temp


# BUG 7: Catching all exceptions (bad practice)
def risky_operation():
    try:
        do_something_dangerous()
    except:  # BAD: Catching all exceptions hides bugs
        pass


# BUG 8: Mutable default argument
def append_to_list(item, target_list=[]):  # BAD: Mutable default!
    target_list.append(item)
    return target_list


# IMPROVEMENT: Could use type hints
def multiply(a, b):
    return a * b


# NITPICK: Function name could be more descriptive
def x(n):
    return n * 2
