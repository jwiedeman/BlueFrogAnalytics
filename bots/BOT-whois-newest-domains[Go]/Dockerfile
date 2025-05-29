FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o whois_grabber main.go

FROM alpine:3.17
RUN apk add --no-cache ca-certificates
COPY --from=builder /app/whois_grabber /usr/local/bin/whois_grabber
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
CMD ["/entrypoint.sh"]
