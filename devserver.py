import http.server
import socketserver

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

if __name__ == "__main__":
    PORT = 8000  # Change to your desired port number
    handler = NoCacheHTTPRequestHandler

    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print("Serving at port", PORT)
        httpd.serve_forever()
