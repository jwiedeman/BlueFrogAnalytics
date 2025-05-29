#!/usr/bin/env python3
import os
import argparse
import importlib.util
import traceback
import logging
import inspect

def setup_logging(verbose=False):
    log_level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

def load_test_module(test_file_path):
    """Dynamically load a Python module from the given file path."""
    module_name = os.path.splitext(os.path.basename(test_file_path))[0]
    logging.debug(f"Loading module '{module_name}' from {test_file_path}")
    spec = importlib.util.spec_from_file_location(module_name, test_file_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    logging.debug(f"Module '{module_name}' loaded successfully")
    return module

def run_tests(selected_tests, target):
    """Discover and run test modules based on selected tests, passing in the testing target.
    
    If a test's run_test function accepts more than one parameter, it will be passed a custom headers
    dictionary (with a modern User-Agent) as a second argument.
    """
    test_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tests")
    if not os.path.exists(test_folder):
        logging.error("Tests folder not found.")
        return ["Tests folder not found."]
    
    results = []
    available_tests = sorted([f for f in os.listdir(test_folder) if f.endswith('.py')])
    logging.debug(f"Available tests: {available_tests}")
    
    # Determine which tests to run: all tests or only specified ones.
    if selected_tests == "all":
        tests_to_run = available_tests
    else:
        tests_to_run = []
        for test in selected_tests:
            candidate = test if test.endswith('.py') else f"{test}.py"
            if candidate in available_tests:
                tests_to_run.append(candidate)
            else:
                message = f"Test {test}: NOT FOUND"
                logging.warning(message)
                results.append(message)
    
    if not tests_to_run:
        message = "No valid tests selected."
        logging.error(message)
        results.append(message)
        return results
    
    logging.info(f"Running tests: {tests_to_run} on target: {target}")
    
    # Define a custom header dictionary to mimic a modern browser.
    headers = {
        "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                       "AppleWebKit/537.36 (KHTML, like Gecko) "
                       "Chrome/115.0 Safari/537.36")
    }
    
    # Run each test with the provided target.
    for test_file in tests_to_run:
        test_file_path = os.path.join(test_folder, test_file)
        logging.debug(f"Running test module: {test_file}")
        try:
            module = load_test_module(test_file_path)
            if hasattr(module, "run_test") and callable(module.run_test):
                # Check if run_test accepts a second parameter (e.g., headers).
                sig = inspect.signature(module.run_test)
                if len(sig.parameters) >= 2:
                    output = module.run_test(target, headers)
                else:
                    output = module.run_test(target)
                result_message = f"Test {test_file}: PASS\nOutput: {output}\n"
                results.append(result_message)
                logging.info(f"Test {test_file} PASSED")
            else:
                message = f"Test {test_file}: SKIPPED - no run_test() function found"
                results.append(message)
                logging.warning(message)
        except Exception:
            error_details = traceback.format_exc()
            result_message = f"Test {test_file}: FAIL\nError: {error_details}\n"
            results.append(result_message)
            logging.error(f"Test {test_file} FAILED: {error_details}")
    return results

def main():
    parser = argparse.ArgumentParser(description="CLI Test Runner")
    parser.add_argument("--tests", nargs="+", help="Specify one or more test names (without .py extension) to run")
    parser.add_argument("--all", action="store_true", help="Run all tests")
    parser.add_argument("--target", required=True, help="Testing target (e.g., domain or URL)")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    args = parser.parse_args()
    
    setup_logging(verbose=args.verbose)
    
    # Default to running all tests if none are specified.
    selected_tests = "all" if args.all or not args.tests else args.tests
    logging.debug(f"Selected tests: {selected_tests}")
    
    results = run_tests(selected_tests, args.target)
    
    # Save results to a local text file.
    output_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results.txt")
    try:
        with open(output_file, "w") as f:
            f.write("\n".join(results))
        logging.info(f"Test results saved to {output_file}")
    except Exception as e:
        logging.error(f"Failed to save results to {output_file}: {e}")
        print(f"Failed to save results: {e}")

if __name__ == "__main__":
    main()
