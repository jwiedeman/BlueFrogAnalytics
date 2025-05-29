# 1. Clean out any old build artifacts
go clean
rm -f certstream_etl

# 2. Ensure your module file is up to date
go mod tidy

# 3. Fetch/update dependencies
go get github.com/dustin/go-humanize \
       github.com/gocql/gocql \
       golang.org/x/net/publicsuffix

# 4. Build the new binary
go build -o certstream_etl unload_certstream_domains.go

# 5. Launch it
./certstream_etl
