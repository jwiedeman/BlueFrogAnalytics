import ssl
import socket
import time
import datetime
from cryptography import x509
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes  # Import the proper hash algorithm

def run_test(target):
    """
    Comprehensive Certificate Details Test.
    
    This test connects to the provided target (assumed to be a domain) on port 443,
    measures the TLS handshake time, and retrieves detailed SSL certificate information.
    It extracts and returns:
      - Handshake time (in seconds)
      - Negotiated TLS version and cipher suite
      - ALPN and NPN protocols (if available)
      - Whether the SSL session was reused
      - Compression method
      - Forward Secrecy status (based on cipher suite)
      - Issuer and Subject (in RFC4514 format)
      - Validity period and days until expiration
      - Serial number and certificate version
      - Signature algorithm
      - Public key details (type and key size)
      - SHA256 fingerprint
      - Subject Alternative Names (SANs)
    
    The collected data provides a robust view of the server’s certificate and TLS configuration.
    """
    # Normalize target: remove scheme if present.
    if target.startswith("http://"):
        target = target[len("http://"):]
    elif target.startswith("https://"):
        target = target[len("https://"):]
    host = target.split("/")[0]
    port = 443

    context = ssl.create_default_context()
    
    try:
        # Create a TCP connection and measure handshake time.
        sock = socket.create_connection((host, port), timeout=10)
        handshake_start = time.time()
        with context.wrap_socket(sock, server_hostname=host) as ssock:
            handshake_time = time.time() - handshake_start
            tls_version = ssock.version()
            cipher_suite = ssock.cipher()  # Tuple: (cipher_name, protocol, secret_bits)
            
            # Additional TLS details.
            alpn_protocol = ssock.selected_alpn_protocol() if hasattr(ssock, "selected_alpn_protocol") else None
            npn_protocol = ssock.selected_npn_protocol() if hasattr(ssock, "selected_npn_protocol") else None
            session_reused = ssock.session_reused if hasattr(ssock, "session_reused") else None
            compression_method = ssock.compression() or "None"
            
            # Forward Secrecy check.
            cipher_name = cipher_suite[0] if cipher_suite and len(cipher_suite) > 0 else ""
            forward_secrecy = "Yes" if ("ECDHE" in cipher_name or "DHE" in cipher_name) else "No"
            
            binary_cert = ssock.getpeercert(binary_form=True)
    except Exception as e:
        return f"Certificate Details test for {host} failed: {e}"
    
    # Parse the certificate using cryptography.
    try:
        cert = x509.load_der_x509_certificate(binary_cert, default_backend())
    except Exception as e:
        return f"Failed to parse certificate for {host}: {e}"
    
    # Extract certificate fields.
    issuer = cert.issuer.rfc4514_string()
    subject = cert.subject.rfc4514_string()
    not_before = cert.not_valid_before
    not_after = cert.not_valid_after
    serial_number = cert.serial_number
    version = cert.version.name  # e.g., v3
    try:
        signature_algorithm = cert.signature_algorithm_oid._name
    except AttributeError:
        signature_algorithm = "Unknown"
    
    # Public key details.
    public_key = cert.public_key()
    if hasattr(public_key, "key_size"):
        public_key_info = f"{public_key.__class__.__name__}, {public_key.key_size} bits"
    else:
        public_key_info = "Unavailable"
    
    # SHA256 fingerprint using cryptography's hashes.
    fingerprint = cert.fingerprint(hashes.SHA256()).hex()
    
    # Subject Alternative Names (SANs).
    san = []
    try:
        ext = cert.extensions.get_extension_for_class(x509.SubjectAlternativeName)
        san = ext.value.get_values_for_type(x509.DNSName)
    except Exception:
        san = []
    
    # Calculate days until expiration.
    today = datetime.datetime.utcnow()
    days_to_expire = (not_after - today).days
    
    # Build the result summary.
    result_lines = [
        f"Certificate Details for {host}:",
        f"Handshake Time: {handshake_time:.3f} seconds",
        f"TLS Version: {tls_version}",
        f"Cipher Suite: {cipher_suite}",
        f"ALPN Protocol: {alpn_protocol or 'None'}",
        f"NPN Protocol: {npn_protocol or 'None'}",
        f"Session Reused: {session_reused}",
        f"Compression: {compression_method}",
        f"Forward Secrecy: {forward_secrecy}",
        "",
        f"Issuer: {issuer}",
        f"Subject: {subject}",
        f"Valid From: {not_before}",
        f"Valid To: {not_after}",
        f"Days Until Expiration: {days_to_expire}",
        f"Serial Number: {serial_number}",
        f"Certificate Version: {version}",
        f"Signature Algorithm: {signature_algorithm}",
        f"Public Key: {public_key_info}",
        f"SHA256 Fingerprint: {fingerprint}",
        "Subject Alternative Names (SANs):"
    ]
    
    if san:
        for name in san:
            result_lines.append(f" - {name}")
    else:
        result_lines.append(" - None found")
    
    return "\n".join(result_lines)
