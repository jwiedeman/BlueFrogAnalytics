#!/bin/sh
# Cron job to run whois_grabber twice a day at midnight and noon
# Write log to /var/log/cron.log
echo "0 0,12 * * * whois_grabber >> /var/log/cron.log 2>&1" > /etc/crontabs/root
# Start cron in foreground
crond -f
