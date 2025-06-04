#!/usr/bin/env python3
import os
import argparse
import importlib.util
import traceback
import logging
import inspect
from tech_data import get_detector

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
    """Discover and run test modules from this bot and BOT-Recon_[Py]."""

    base_dir = os.path.dirname(os.path.abspath(__file__))
    local_tests_dir = os.path.join(base_dir, "tests")
    recon_tests_dir = os.path.join(base_dir, "..", "BOT-Recon_[Py]", "tests")

    test_locations = []
    for folder in (local_tests_dir, recon_tests_dir):
        if os.path.exists(folder):
            test_locations.append(folder)
        else:
            logging.warning(f"Tests folder missing: {folder}")

    results = []
    available_tests = {}
    for folder in test_locations:
        for fname in os.listdir(folder):
            if fname.endswith(".py"):
                available_tests[fname] = os.path.join(folder, fname)
    logging.debug(f"Available tests: {list(available_tests.keys())}")
    
    # Determine which tests to run: all tests or only specified ones.
    if selected_tests == "all":
        tests_to_run = list(available_tests.keys())
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
        test_file_path = available_tests[test_file]
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


def run_fingerprint(target):
    """Run the technology matcher directly."""
    if not target.startswith("http://") and not target.startswith("https://"):
        variants = [
            f"http://{target}",
            f"https://{target}",
            f"http://www.{target}",
            f"https://www.{target}",
        ]
    else:
        variants = [target]

    detector = get_detector()
    excluded = {
        "CMS",
        "Authentication",
        "Payment processors",
        "Buy now pay later",
        "Advertising",
        "Live chat",
        "Message boards",
    }
    for url in variants:
        try:
            results = detector.analyze_with_versions_and_categories(
                url, min_confidence=150, exclude_categories=excluded
            )
            if results:
                lines = [f"URL used: {url}"]
                for name, data in results.items():
                    cats = ", ".join(data.get("categories", [])) or "-"
                    vers = ", ".join(data.get("versions", [])) or "-"
                    lines.append(f"{name}: {vers} [{cats}]")
                return "\n".join(lines)
        except Exception:
            continue
    return "No technologies detected"

def main():
    parser = argparse.ArgumentParser(description="CLI Test Runner")
    parser.add_argument("--tests", nargs="+", help="Specify one or more test names (without .py extension) to run")
    parser.add_argument("--all", action="store_true", help="Run all tests")
    parser.add_argument("--target", required=True, help="Testing target (e.g., domain or URL)")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    parser.add_argument("--fingerprint", action="store_true", help="Run the fingerprinting engine before tests")
    parser.add_argument("--fingerprint-only", action="store_true", help="Run only the fingerprinting engine and skip tests")
    args = parser.parse_args()
    
    setup_logging(verbose=args.verbose)

    results = []
    if args.fingerprint or args.fingerprint_only:
        logging.info("Running fingerprinting engine")
        fp_output = run_fingerprint(args.target)
        results.append(f"Fingerprinting:\n{fp_output}\n")

    if not args.fingerprint_only:
        # Default to running all tests if none are specified.
        selected_tests = "all" if args.all or not args.tests else args.tests
        logging.debug(f"Selected tests: {selected_tests}")
        results.extend(run_tests(selected_tests, args.target))
    
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
