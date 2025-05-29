#!/usr/bin/env python3

import time
import threading
import queue
import gevent.monkey
from concurrent.futures import ThreadPoolExecutor
from collections import deque
import statistics
import random
import logging
import sys

gevent.monkey.patch_all()

import cassandra.connection
from cassandra.io import geventreactor
cassandra.connection.Connection = geventreactor.GeventConnection
from cassandra.cluster import Cluster, ConsistencyLevel
from cassandra.policies import DCAwareRoundRobinPolicy, RetryPolicy, DowngradingConsistencyRetryPolicy
from cassandra.query import SimpleStatement, BatchStatement, BatchType
from cassandra import Unavailable, OperationTimedOut, WriteTimeout, ReadTimeout
import tldextract

# --- Logging configuration with UTF-8 ---
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
logger.handlers.clear()

stream_handler = logging.StreamHandler(open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1))
stream_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
stream_handler.setFormatter(stream_formatter)
logger.addHandler(stream_handler)

file_handler = logging.FileHandler('cassandra_etl.log')
file_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
file_handler.setFormatter(file_formatter)
logger.addHandler(file_handler)

# --- Configuration Constants ---
MAX_WORKERS = 3
MIN_WORKERS = 1  
INITIAL_THROTTLE = 0.05  
MAX_THROTTLE = 2.0  
THROTTLE_WINDOW = 100  
BACKOFF_FACTOR = 2.0  
SUCCESS_FACTOR = 0.95  
ERROR_THRESHOLD = 0.03  
MAX_BATCH_SIZE = 100
MAX_RETRY_ATTEMPTS = 10  

CIRCUIT_BREAKER_THRESHOLD = 20  
CIRCUIT_BREAKER_TIMEOUT = 60  

# --- ThrottleManager class ---
class ThrottleManager:
    def __init__(self):
        self.lock = threading.RLock()
        self.active_workers = MAX_WORKERS
        self.current_throttle = INITIAL_THROTTLE
        self.operation_times = deque(maxlen=THROTTLE_WINDOW)
        self.error_counts = deque(maxlen=THROTTLE_WINDOW)
        self.total_ops = 0
        self.total_errors = 0
        self.consecutive_errors = 0
        self.circuit_open = False
        self.circuit_open_time = 0
        self.consistency_level = ConsistencyLevel.SERIAL
    
    def record_operation(self, duration, had_error):
        with self.lock:
            self.operation_times.append(duration)
            self.error_counts.append(1 if had_error else 0)
            self.total_ops += 1
            
            if had_error:
                self.total_errors += 1
                self.consecutive_errors += 1
                if self.consecutive_errors >= CIRCUIT_BREAKER_THRESHOLD and not self.circuit_open:
                    logger.warning(f"Circuit breaker tripped after {self.consecutive_errors} consecutive errors")
                    self.circuit_open = True
                    self.circuit_open_time = time.time()
                    if self.consistency_level == ConsistencyLevel.SERIAL:
                        self.consistency_level = ConsistencyLevel.LOCAL_SERIAL
                        logger.warning("Downgrading consistency level to LOCAL_SERIAL")
            else:
                self.consecutive_errors = 0
                if self.circuit_open and time.time() - self.circuit_open_time > CIRCUIT_BREAKER_TIMEOUT:
                    logger.info(f"Circuit breaker reset after {CIRCUIT_BREAKER_TIMEOUT}s cooldown")
                    self.circuit_open = False
                    if self.consistency_level == ConsistencyLevel.LOCAL_SERIAL:
                        self.consistency_level = ConsistencyLevel.SERIAL
                        logger.info("Restoring consistency level to SERIAL")
            
            if len(self.operation_times) >= THROTTLE_WINDOW // 2:
                self._adjust_throttling()
    
    def _adjust_throttling(self):
        recent_error_rate = sum(self.error_counts) / len(self.error_counts)
        avg_op_time = statistics.mean(self.operation_times) if self.operation_times else 0
        
        if recent_error_rate > ERROR_THRESHOLD:
            self.current_throttle = min(self.current_throttle * BACKOFF_FACTOR, MAX_THROTTLE)
            self.active_workers = max(self.active_workers - 1, MIN_WORKERS)
            logger.warning(f"Backoff: {recent_error_rate:.1%} error rate, {avg_op_time:.3f}s avg time. Throttle: {self.current_throttle:.3f}s, Workers: {self.active_workers}")
        elif recent_error_rate < ERROR_THRESHOLD / 3 and avg_op_time < 0.2 and not self.circuit_open:
            self.current_throttle = max(self.current_throttle * SUCCESS_FACTOR, INITIAL_THROTTLE)
            if self.active_workers < MAX_WORKERS:
                self.active_workers = min(self.active_workers + 1, MAX_WORKERS)
                logger.info(f"Speed up: {recent_error_rate:.1%} error rate, {avg_op_time:.3f}s avg time. Throttle: {self.current_throttle:.3f}s, Workers: {self.active_workers}")
    
    def get_throttle(self):
        with self.lock:
            jitter = random.uniform(0.9, 1.1)
            if self.circuit_open:
                return min(self.current_throttle * jitter * 2, MAX_THROTTLE)
            return self.current_throttle * jitter
    
    def get_worker_count(self):
        with self.lock:
            return self.active_workers
    
    def get_stats(self):
        with self.lock:
            error_rate = self.total_errors / max(self.total_ops, 1)
            return {
                "total_ops": self.total_ops,
                "error_rate": error_rate,
                "throttle": self.current_throttle,
                "workers": self.active_workers,
                "consistency": str(self.consistency_level).split('.')[-1],
                "circuit": "OPEN" if self.circuit_open else "CLOSED"
            }
    
    def get_consistency_level(self):
        with self.lock:
            return self.consistency_level

# --- safe_execute ---
def safe_execute(session, query, params, throttle_mgr, attempt=1):
    delay = 5  
    start_time = time.time()
    had_error = False
    
    if throttle_mgr.circuit_open:
        time.sleep(throttle_mgr.get_throttle() * 2)
    
    if isinstance(query, SimpleStatement):
        if "IF EXISTS" in query.query_string.upper() or "IF NOT EXISTS" in query.query_string.upper():
            query.consistency_level = ConsistencyLevel.ANY
        else:
            query.consistency_level = throttle_mgr.get_consistency_level()
    elif hasattr(query, 'consistency_level'):
        qtext = query.query_string.upper() if hasattr(query, 'query_string') else ""
        if "IF EXISTS" in qtext or "IF NOT EXISTS" in qtext:
            query.consistency_level = ConsistencyLevel.ANY
        else:
            query.consistency_level = throttle_mgr.get_consistency_level()
    
    while attempt <= MAX_RETRY_ATTEMPTS:
        try:
            result = session.execute(query, params)
            duration = time.time() - start_time
            throttle_mgr.record_operation(duration, had_error)
            return result
        except (OperationTimedOut, Unavailable, WriteTimeout, ReadTimeout) as e:
            had_error = True
            if isinstance(e, WriteTimeout) and "SERIAL" in str(e):
                logger.error(f"LWT contention detected: {e}")
                # Immediately downgrade consistency level if still set to SERIAL.
                if isinstance(query, SimpleStatement) and query.consistency_level == ConsistencyLevel.SERIAL:
                    query.consistency_level = ConsistencyLevel.LOCAL_SERIAL
                    logger.info("Temporarily downgraded to LOCAL_SERIAL for this query due to LWT contention")
                delay = min(delay * 2, 30)
            elif isinstance(e, Unavailable):
                logger.error(f"Unavailable error: {e}")
                delay = min(delay * 3, 60)
            else:
                logger.error(f"Error ({type(e).__name__}): {e}")
                delay = min(delay * 1.5, 20)
            
            logger.warning(f"Retrying in {delay}s... (attempt {attempt}/{MAX_RETRY_ATTEMPTS})")
            time.sleep(delay)
            attempt += 1
    
    logger.error(f"Gave up after {MAX_RETRY_ATTEMPTS} attempts")
    duration = time.time() - start_time
    throttle_mgr.record_operation(duration, True)
    raise Exception(f"Maximum retry attempts ({MAX_RETRY_ATTEMPTS}) exceeded")

# --- Domain Parsing ---
def parse_domain(raw_domain):
    ext = tldextract.extract(raw_domain)
    domain_str = ext.domain
    tld_str = ext.suffix
    subdomain = f"{ext.subdomain}.{domain_str}.{tld_str}" if (ext.subdomain and ext.subdomain.lower() != "www") else ""
    return domain_str, tld_str, subdomain

# --- Prepare Statements ---
# --- Prepare Statements ---
# --- Minimal Prepared Statements ---
def prepare_statements_minimal(session):
    stmts = {
        # Unconditional upsert (INSERT in Cassandra is an upsert)
        'upsert': session.prepare("""
            INSERT INTO domains_processed (domain, tld, raw_subdomains)
            VALUES (?, ?, ?)
        """),
        # Delete from the source table after processing
        'delete': session.prepare("""
            DELETE FROM certstream_domains WHERE domain = ?
        """)
    }
    return stmts


# --- upsert_domain ---
def upsert_domain(session, stmts, domain, tld, subdomain, throttle_mgr):
    """
    Modified atomic upsert.
    Accepts subdomain as either a string or a set.
    If it’s a set, use it directly; otherwise, wrap it.
    """
    additions = subdomain if isinstance(subdomain, set) else {subdomain} if subdomain else set()
    if not additions:
        return

    try:
        check_result = safe_execute(session, stmts['check'], (domain, tld), throttle_mgr)
        result_row = check_result.one()
        if result_row:
            existing = result_row.raw_subdomains or set()
            merged = existing | additions
            if throttle_mgr.circuit_open or throttle_mgr.consecutive_errors > 5:
                safe_execute(session, stmts['force_update'], (merged, domain, tld), throttle_mgr)
            else:
                update_result = safe_execute(session, stmts['update'], (additions, domain, tld), throttle_mgr)
                update_row = update_result.one()
                if not update_row.applied:
                    safe_execute(session, stmts['force_update'], (merged, domain, tld), throttle_mgr)
        else:
            insert_result = safe_execute(session, stmts['insert'], (domain, tld, additions), throttle_mgr)
            insert_row = insert_result.one()
            if not insert_row.applied:
                check_result = safe_execute(session, stmts['check'], (domain, tld), throttle_mgr)
                result_row = check_result.one()
                if result_row:
                    existing = result_row.raw_subdomains or set()
                    merged = existing | additions
                    safe_execute(session, stmts['force_update'], (merged, domain, tld), throttle_mgr)
    
    except Exception as e:
        logger.error(f"Failed to upsert domain {domain}.{tld}: {e}")
        throttle_mgr.record_operation(1.0, True)



# --- Minimal Batch Flush with Dynamic Chunking ---
def flush_batch_minimal(session, stmts, batch_updates, throttle_mgr, stats):
    """
    Build and execute BatchStatements in chunks that are dynamically sized.
    For each (domain, tld) key we simply INSERT the accumulated subdomains.
    We also delete the processed domain from certstream_domains.
    """
    # Get dynamic chunk size; default to 20 if not set
    chunk_size = stats.get('batch_chunk_size', 20)
    keys = list(batch_updates.items())
    i = 0
    while i < len(keys):
        chunk = keys[i:i+chunk_size]
        batch = BatchStatement(batch_type=BatchType.LOGGED)
        for (domain, tld), sub_set in chunk:
            batch.add(stmts['upsert'], (domain, tld, sub_set))
            batch.add(stmts['delete'], (domain,))
        try:
            session.execute(batch)
            with stats['lock']:
                stats['processed'] += len(chunk)
            i += chunk_size
        except Exception as e:
            if "Batch too large" in str(e):
                # If the batch is too large, reduce the chunk size
                new_chunk_size = max(1, chunk_size // 2)
                logger.error(f"Batch too large, reducing chunk size from {chunk_size} to {new_chunk_size}")
                stats['batch_chunk_size'] = new_chunk_size
                chunk_size = new_chunk_size
                # If chunk_size is 1, process each operation individually
                if chunk_size == 1:
                    for (domain, tld), sub_set in chunk:
                        batch_single = BatchStatement(batch_type=BatchType.LOGGED)
                        batch_single.add(stmts['upsert'], (domain, tld, sub_set))
                        batch_single.add(stmts['delete'], (domain,))
                        session.execute(batch_single)
                        with stats['lock']:
                            stats['processed'] += 1
                    i += chunk_size
            else:
                logger.error(f"Error executing batch: {e}")
                raise

# --- Worker Task with Batching ---
# --- Minimal Worker Task ---
def worker_task_minimal(task_queue, cluster, keyspace, throttle_mgr, stats):
    """
    This worker thread reads domains from the queue, processes each with parse_domain,
    accumulates them (merging subdomains per domain), and then flushes the batch using the
    minimal (no extra checks) logic.
    """
    try:
        session = cluster.connect(keyspace)
        session.default_timeout = 15
        stmts = prepare_statements_minimal(session)
        
        logger.info("Worker thread started (minimal)")
        
        batch_updates = {}  # key: (domain, tld), value: set of subdomains
        last_flush = time.time()
        BATCH_FLUSH_INTERVAL = 0.5  # flush every 0.5 seconds
        BATCH_SIZE_LIMIT = 50       # or when 50 unique keys have accumulated
        
        while True:
            try:
                item = task_queue.get(timeout=0.2)
                if item is None:
                    # Flush any remaining batch then exit
                    if batch_updates:
                        flush_batch_minimal(session, stmts, batch_updates, throttle_mgr, stats)
                    task_queue.task_done()
                    break
                
                domain, tld, sub = parse_domain(item)
                if domain and tld:
                    key = (domain, tld)
                    batch_updates.setdefault(key, set()).add(sub)
                task_queue.task_done()
                
                now = time.time()
                if now - last_flush >= BATCH_FLUSH_INTERVAL or len(batch_updates) >= BATCH_SIZE_LIMIT:
                    flush_batch_minimal(session, stmts, batch_updates, throttle_mgr, stats)
                    batch_updates.clear()
                    last_flush = now
                
            except queue.Empty:
                now = time.time()
                if batch_updates and now - last_flush >= BATCH_FLUSH_INTERVAL:
                    flush_batch_minimal(session, stmts, batch_updates, throttle_mgr, stats)
                    batch_updates.clear()
                    last_flush = now
                continue
            except Exception as e:
                logger.error(f"Worker error (minimal): {e}")
                throttle_mgr.record_operation(1.0, True)
    except Exception as e:
        logger.error(f"Worker thread initialization error (minimal): {e}")
    finally:
        logger.info("Worker thread shutting down (minimal)")


# --- Batch Fetcher ---
# --- (Optional) Batch Fetcher can remain largely the same ---
def batch_fetcher(task_queue, cluster, keyspace, throttle_mgr, batch_size=50):
    try:
        session = cluster.connect(keyspace)
        logger.info("Starting batch fetcher thread")
        
        query = SimpleStatement(
            "SELECT domain FROM certstream_domains",
            fetch_size=batch_size,
            consistency_level=ConsistencyLevel.QUORUM
        )
        
        total_fetched = 0
        for row in session.execute(query):
            while task_queue.qsize() > batch_size * 10:
                time.sleep(1)
            if not row.domain:
                continue
            task_queue.put(row.domain)
            total_fetched += 1
            if total_fetched % batch_size == 0:
                throttle = throttle_mgr.get_throttle()
                logger.info(f"Fetched {total_fetched} domains. Queue size: {task_queue.qsize()}. Throttling: {throttle:.3f}s")
                time.sleep(throttle / 2)
        
        logger.info(f"Finished fetching {total_fetched} domains")
        return total_fetched
        
    except Exception as e:
        logger.error(f"Batch fetcher error: {e}")
        return 0
    finally:
        logger.info("Batch fetcher thread shutting down")

# --- Main ETL Process ---
def main():
    cluster = Cluster(
        contact_points=["192.168.1.201", "192.168.1.202", "192.168.1.203", "192.168.1.204"],
        load_balancing_policy=DCAwareRoundRobinPolicy(),
        default_retry_policy=DowngradingConsistencyRetryPolicy(),
        connect_timeout=60,
        control_connection_timeout=20,
        idle_heartbeat_interval=30,
        idle_heartbeat_timeout=60,
        protocol_version=4,
        compression=True
    )
    
    keyspace = "domain_discovery"
    
    try:
        session = cluster.connect(keyspace)
        throttle_mgr = ThrottleManager()
        
        stats = {
            'processed': 0,
            'lock': threading.Lock(),
            'start_time': time.time()
        }
        
        task_queue = queue.Queue(maxsize=5000)
        
        logger.info("Starting domain processing with minimal checks")
        
        fetcher_thread = threading.Thread(
            target=batch_fetcher,
            args=(task_queue, cluster, keyspace, throttle_mgr, MAX_BATCH_SIZE)
        )
        fetcher_thread.daemon = True
        fetcher_thread.start()
        
        workers = []
        initial_workers = 3  # Adjust as needed
        
        for i in range(initial_workers):
            t = threading.Thread(
                target=worker_task_minimal,
                args=(task_queue, cluster, keyspace, throttle_mgr, stats)
            )
            t.daemon = True
            t.start()
            workers.append(t)
            time.sleep(0.5)
            
        stop_monitor = threading.Event()
        
        def monitor_progress():
            last_count = 0
            last_check_time = time.time()
            worker_count = initial_workers
            max_rate = 0
            
            while not stop_monitor.is_set():
                current_time = time.time()
                with stats['lock']:
                    current = stats['processed']
                    elapsed = current_time - stats['start_time']
                    interval = current_time - last_check_time
                    recent_rate = (current - last_count) / interval if interval > 0 else 0
                    overall_rate = current / elapsed if elapsed > 0 else 0
                    
                if recent_rate > max_rate:
                    max_rate = recent_rate
                    
                throttle_stats = throttle_mgr.get_stats()
                logger.info(f"Processed: {current} domains ({recent_rate:.1f}/sec recent, {overall_rate:.1f}/sec avg, {max_rate:.1f}/sec max). "
                            f"Queue: {task_queue.qsize()}, Workers: {worker_count}/{throttle_stats['workers']}, "
                            f"Throttle: {throttle_stats['throttle']:.4f}s, Errors: {throttle_stats['error_rate']:.1%}, "
                            f"Circuit: {throttle_stats['circuit']}, CL: {throttle_stats['consistency']}")
                
                last_count = current
                last_check_time = current_time
                time.sleep(5)
        
        monitor_thread = threading.Thread(target=monitor_progress)
        monitor_thread.daemon = True
        monitor_thread.start()
        
        fetcher_thread.join()
        logger.info("Fetch complete, waiting for processing to finish")
        
        task_queue.join()
        logger.info("All tasks processed")
        
        for _ in range(len(workers)):
            task_queue.put(None)
        
        stop_monitor.set()
        monitor_thread.join(timeout=1)
        
        for worker in workers:
            worker.join(timeout=1)
        
        with stats['lock']:
            total = stats['processed']
            elapsed = time.time() - stats['start_time']
            logger.info(f"Completed! Total processed: {total} domains in {elapsed:.1f} seconds ({total/elapsed:.1f}/sec)")
        
    except Exception as e:
        logger.error(f"Main process error: {e}")
    finally:
        logger.info("Shutting down cluster")
        cluster.shutdown()

if __name__ == "__main__":
    main()