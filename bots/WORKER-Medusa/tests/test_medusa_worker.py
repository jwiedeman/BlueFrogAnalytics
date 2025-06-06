import sys
import types
import importlib.util
from pathlib import Path
import pytest


def load_medusa(monkeypatch):
    """Load medusa module with external deps stubbed."""
    def stub(name, **attrs):
        mod = types.ModuleType(name)
        for k, v in attrs.items():
            setattr(mod, k, v)
        monkeypatch.setitem(sys.modules, name, mod)
        return mod

    # stub external dependencies
    stub('cassandra',
         OperationTimedOut=Exception,
         Unavailable=Exception,
         WriteTimeout=Exception,
         ReadTimeout=Exception)
    stub('cassandra.cluster', Cluster=object)
    stub('cassandra.policies',
         DCAwareRoundRobinPolicy=object,
         RetryPolicy=object)
    stub('tldextract', extract=lambda url: types.SimpleNamespace(domain='ex', suffix='com'))
    stub('dns.resolver', resolve=lambda *a, **k: [])
    dns_mod = stub('dns')
    dns_mod.resolver = sys.modules['dns.resolver']
    stub('requests',
         get=lambda *a, **k: types.SimpleNamespace(history=[], url=a[0], status_code=200, text=''),
         options=lambda *a, **k: types.SimpleNamespace(status_code=200, headers={'Allow': 'GET'}, url=a[0]),
         head=lambda *a, **k: types.SimpleNamespace(status_code=200),
         post=lambda *a, **k: types.SimpleNamespace(status_code=200))
    stub('bs4', BeautifulSoup=lambda *a, **k: types.SimpleNamespace(find_all=lambda *args, **kwargs: [], text=''))

    # stub run_test modules used by medusa
    test_modules = [
        'test_open_ports',
        'test_http_methods',
        'test_waf_detection',
        'test_directory_enumeration',
        'test_certificate_details',
        'test_meta_tags',
        'test_compare_sitemaps_robots',
        'test_cookie_settings',
        'test_external_resources',
        'test_passive_subdomains',
    ]
    for name in test_modules:
        stub(f'tests.{name}', run_test=lambda *a, **k: 'stub')

    # load module from file
    path = Path(__file__).resolve().parent.parent / 'medusa.py'
    spec = importlib.util.spec_from_file_location('medusa', path)
    medusa = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(medusa)
    return medusa


@pytest.fixture
def medusa(monkeypatch):
    return load_medusa(monkeypatch)


def test_parse_args_with_tests(monkeypatch, medusa):
    monkeypatch.setattr(sys, 'argv', ['medusa.py', '--domain', 'example.com', '--tests', 'ssl,dns'])
    args = medusa.parse_args()
    assert args.domain == 'example.com'
    assert args.tests == 'ssl,dns'
    assert not args.all


def test_parse_args_all(monkeypatch, medusa):
    monkeypatch.setattr(sys, 'argv', ['medusa.py', '--domain', 'example.com', '--all'])
    args = medusa.parse_args()
    assert args.all is True
    assert args.domain == 'example.com'


def test_run_scans_invokes_functions(monkeypatch, medusa):
    calls = []

    def make(name):
        def func(domain, session):
            calls.append((name, domain, session))
        return func

    fake_tests = {'one': make('one'), 'two': make('two')}
    monkeypatch.setattr(medusa, 'TESTS', fake_tests, raising=False)
    medusa.run_scans('example.com', ['one', 'two'], 'session')

    assert ('one', 'example.com', 'session') in calls
    assert ('two', 'example.com', 'session') in calls
