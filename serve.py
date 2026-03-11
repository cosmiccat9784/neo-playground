import http.server
import socketserver
import os


def main() -> None:
    port = 8000
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", port), handler) as httpd:
        print(f"Serving Neo Games at http://localhost:{port}")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
