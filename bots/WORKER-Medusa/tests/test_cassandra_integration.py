import sys
import types

import pytest

from .test_medusa_worker import load_medusa

@pytest.fixture
def medusa(monkeypatch):
    return load_medusa(monkeypatch)


def test_cassandra_session_env(monkeypatch, medusa):
    calls = {}

    class FakeSession:
        def __init__(self):
            self.default_timeout = None

    class FakeCluster:
        def __init__(self, **kwargs):
            calls.update(kwargs)
        def connect(self, keyspace):
            calls['keyspace'] = keyspace
            return FakeSession()

    monkeypatch.setenv('MEDUSA_CASSANDRA_HOSTS', '1.1.1.1,2.2.2.2')
    monkeypatch.setenv('MEDUSA_CASSANDRA_PORT', '9999')
    monkeypatch.setenv('MEDUSA_CASSANDRA_KEYSPACE', 'ks')
    monkeypatch.setenv('MEDUSA_CASSANDRA_DC', 'dc1')

    monkeypatch.setattr(medusa, 'Cluster', FakeCluster)
    monkeypatch.setattr(medusa, 'DCAwareRoundRobinPolicy', lambda local_dc: local_dc)

    cluster, session = medusa._cassandra_session()
    assert calls['contact_points'] == ['1.1.1.1', '2.2.2.2']
    assert calls['port'] == 9999
    assert calls['keyspace'] == 'ks'
    assert isinstance(session, FakeSession)
    assert isinstance(cluster, FakeCluster)


def test_update_enrichment(monkeypatch, medusa):
    class FakeSession:
        def prepare(self, query):
            return 'stmt'

    executed = {}
    def fake_safe_execute(session, stmt, params):
        executed['stmt'] = stmt
        executed['params'] = params

    monkeypatch.setattr(medusa, '_safe_execute', fake_safe_execute)
    monkeypatch.setattr(medusa, 'extract', lambda d: types.SimpleNamespace(domain='ex', suffix='com'))

    medusa._update_enrichment(FakeSession(), 'example.com', {'title': 'hi'})
    assert executed['stmt'] == 'stmt'
    assert executed['params'][-2:] == ('ex', 'com')
