#!/usr/bin/env bash
# rebuild-ssh-netplan.sh
# TARS says: “Sometimes you just need a clean slate.”

set -euo pipefail

PASS='!@#$%qwertASDFGzxcvb'
LOGIN_USER="${SUDO_USER:-$(logname 2>/dev/null || echo root)}"

echo "[+] Starting rebuild on $(hostname) as ${LOGIN_USER}"
echo "[+] Step 1/6  — Removing old OpenSSH pieces..."
apt-get update -qq
apt-get purge -y openssh-server openssh-sftp-server 2>/dev/null || true
rm -rf /etc/ssh/*_key /etc/ssh/ssh_host_* /etc/ssh/sshd_config* || true

echo "[+] Step 2/6  — Nuking existing Netplan YAML..."
mkdir -p /etc/netplan/backup
mv /etc/netplan/*.yaml /etc/netplan/backup/ 2>/dev/null || true

echo "[+] Step 3/6  — Installing fresh OpenSSH..."
DEBIAN_FRONTEND=noninteractive apt-get install -y openssh-server net-tools ethtool

echo "[+] Step 4/6  — Building clean sshd_config..."
cat >/etc/ssh/sshd_config <<'EOF'
# Minimal, permissive (for rescue) config — tighten after validation.
Port 22
Protocol 2
ListenAddress 0.0.0.0
PermitRootLogin prohibit-password
PasswordAuthentication yes
PubkeyAuthentication yes
ChallengeResponseAuthentication no
UsePAM yes
X11Forwarding no
Subsystem sftp /usr/lib/openssh/sftp-server
EOF

echo "[+] Step 5/6  — Generating new host keys & restarting SSH..."
dpkg-reconfigure -f noninteractive openssh-server
sshd -t   # sanity check
systemctl restart ssh

echo "[+] Step 6/6  — Re-building Netplan for *all* physical NICs (DHCP)..."
{
  echo "network:"
  echo "  version: 2"
  echo "  renderer: networkd"
  echo "  ethernets:"
  for IF in $(ls /sys/class/net | grep -E '^(e|en|eth|eno|ens|enp|usb)'); do
    echo "    ${IF}:"
    echo "      dhcp4: true"
  done
} >/etc/netplan/00-all-dhcp.yaml

netplan generate
netplan apply || { echo "[!] Netplan apply failed — check YAML."; exit 1; }

echo "[+] Setting password for ${LOGIN_USER}..."
echo "${LOGIN_USER}:${PASS}" | chpasswd

echo -e "\n===== Quick Diagnostics ====="
ip -brief addr
ethtool -i $(ip -o link show | awk -F': ' '{print $2}' | head -n1) | head -n4 || true
systemctl --no-pager status ssh | head -n 15
echo "Netplan current state:"
netplan get | sed 's/^/  /'
echo "================================\n"
echo "[✓] Rebuild complete. Try: ssh ${LOGIN_USER}@$(hostname -I | awk '{print $1}')"