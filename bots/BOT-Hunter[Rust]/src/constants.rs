#[derive(Debug, Clone, Copy)]
pub enum DomainMode {
    TopLevelOnly,
    All,
}

// 0=unvisited, 1=visited, 2=in-progress, 3=unreachable
pub const CRAWL_MODE: DomainMode = DomainMode::TopLevelOnly;
pub const BATCH_SIZE: usize = 2000;
pub const WORKERS: usize = 250;
pub const MAX_CONCURRENT_REQUESTS: usize = 50;
pub const REQUEST_TIMEOUT: u64 = 20;
pub const RETRIES: u32 = 1;
pub const MIN_RETRY_DELAY: u64 = 1;
pub const MAX_JITTER: u64 = 1;
pub const MAX_BATCH_SIZE: usize = 100; // chunk size for updates
