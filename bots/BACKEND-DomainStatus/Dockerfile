FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o domain-status

FROM alpine:3.17
RUN apk add --no-cache ca-certificates
COPY --from=builder /app/domain-status /usr/local/bin/domain-status
ENTRYPOINT ["domain-status"]
