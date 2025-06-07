import sys
import types
import importlib.util
from pathlib import Path
import pytest


def load_medusa(monkeypatch):
    """Load medusa module with external deps stubbed."""

    # Ensure the module loads regardless of the host Python version. The
    # Cassandra driver currently supports up to Python 3.11, so the worker
    # exits early on 3.12+. Patch ``sys.version_info`` so the import succeeds
    # under newer interpreters used during testing.
    monkeypatch.setattr(sys, "version_info", (3, 11, 0), raising=False)

    def stub(name, **attrs):
        mod = types.ModuleType(name)
        for k, v in attrs.items():
            setattr(mod, k, v)
        monkeypatch.setitem(sys.modules, name, mod)
        return mod

    # stub external dependencies
    stub(
        "cassandra",
        OperationTimedOut=Exception,
        Unavailable=Exception,
        WriteTimeout=Exception,
        ReadTimeout=Exception,
    )
    stub("cassandra.cluster", Cluster=object)
    stub("cassandra.policies", DCAwareRoundRobinPolicy=object, RetryPolicy=object)
    stub(
        "tldextract",
        extract=lambda url: types.SimpleNamespace(domain="ex", suffix="com"),
    )
    stub("dns.resolver", resolve=lambda *a, **k: [])
    dns_mod = stub("dns")
    dns_mod.resolver = sys.modules["dns.resolver"]
    stub(
        "requests",
        get=lambda *a, **k: types.SimpleNamespace(
            history=[], url=a[0], status_code=200, text=""
        ),
        options=lambda *a, **k: types.SimpleNamespace(
            status_code=200, headers={"Allow": "GET"}, url=a[0]
        ),
        head=lambda *a, **k: types.SimpleNamespace(status_code=200),
        post=lambda *a, **k: types.SimpleNamespace(status_code=200),
    )
    stub(
        "bs4",
        BeautifulSoup=lambda *a, **k: types.SimpleNamespace(
            find_all=lambda *args, **kwargs: [], text=""
        ),
    )

    # stub run_test modules used by medusa
    test_modules = [
        "open_ports",
        "http_methods",
        "waf_detection",
        "directory_enumeration",
        "certificate_details",
        "meta_tags",
        "compare_sitemaps_robots",
        "cookie_settings",
        "external_resources",
        "passive_subdomains",
        "whois",
        "dns_enumeration",
        "webpagetest",
        "full_page_screenshot",
        "contrast_heatmap",
        "google_maps",
    ]

    # ensure the scans package exists so imports succeed
    stub("scans")
    for name in test_modules:
        stub(f"scans.{name}", run_test=lambda *a, **k: "stub")

    # load module from file
    path = Path(__file__).resolve().parent.parent / "medusa.py"
    spec = importlib.util.spec_from_file_location("medusa", path)
    medusa = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(medusa)
    return medusa


@pytest.fixture(scope="module")
def medusa():
    mp = pytest.MonkeyPatch()
    mod = load_medusa(mp)
    yield mod
    mp.undo()


def test_parse_args_with_tests(monkeypatch, medusa):
    monkeypatch.setattr(
        sys, "argv", ["medusa.py", "--domain", "example.com", "--tests", "ssl,dns"]
    )
    args = medusa.parse_args()
    assert args.domain == "example.com"
    assert args.tests == "ssl,dns"
    assert not args.all


def test_parse_args_all(monkeypatch, medusa):
    monkeypatch.setattr(sys, "argv", ["medusa.py", "--domain", "example.com", "--all"])
    args = medusa.parse_args()
    assert args.all is True
    assert args.domain == "example.com"


def test_parse_args_dev(monkeypatch, medusa):
    monkeypatch.setattr(
        sys, "argv", ["medusa.py", "--domain", "example.com", "--tests", "ssl", "--dev"]
    )
    args = medusa.parse_args()
    assert args.dev is True


def test_run_scans_invokes_functions(monkeypatch, medusa):
    calls = []

    def make(name):
        def func(domain, session):
            calls.append((name, domain, session))

        return func

    fake_tests = {"one": make("one"), "two": make("two")}
    monkeypatch.setattr(medusa, "TESTS", fake_tests, raising=False)
    monkeypatch.setattr(
        medusa,
        "check_site_variants",
        lambda d: ("https://ex.com", [], "", 200, 100),
    )
    monkeypatch.setattr(medusa, "_update_enrichment", lambda *a, **k: None)
    monkeypatch.setattr(medusa, "_update_page_metrics", lambda *a, **k: None)
    medusa.run_scans("example.com", ["one", "two"], "session")

    assert ("one", "ex.com", "session") in calls
    assert ("two", "ex.com", "session") in calls
