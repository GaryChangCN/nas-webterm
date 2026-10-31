#!/usr/bin/env python3
"""Extract the installed ttyd's self-contained page and add same-origin controls."""
import argparse
import gzip
from html.parser import HTMLParser
from pathlib import Path
import re
import subprocess
import time
import urllib.error
import urllib.request


class Assets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.external = []
        self.scripts = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'script':
            self.scripts += 1
            if attrs.get('src'):
                self.external.append(attrs['src'])
        if tag == 'link' and attrs.get('rel') == 'stylesheet' and attrs.get('href'):
            self.external.append(attrs['href'])


def enhance(stock, asset_dir):
    parser = Assets()
    parser.feed(stock)
    if parser.external or parser.scripts < 1 or 'window.term' not in stock:
        raise RuntimeError('Unsupported ttyd frontend: expected inline assets and exposed window.term.')
    if 'nt-webterm-controls' in stock:
        raise RuntimeError('Frontend is already enhanced.')
    css = (asset_dir / 'controls.css').read_text(encoding='utf-8')
    keys = (asset_dir / 'keys.js').read_text(encoding='utf-8')
    controls = (asset_dir / 'controls.js').read_text(encoding='utf-8')
    for script in [keys, controls]:
        if '</script' in script.lower():
            raise RuntimeError('Unsafe inline script closing tag in source.')
    viewport = '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,interactive-widget=resizes-content">'
    stock = re.sub(r'<meta\b[^>]*\bname\s*=\s*[\"\']?viewport[\"\']?[^>]*>', '', stock, flags=re.I)
    injection = '\n' + viewport + '\n<style id="nt-webterm-style">\n' + css + '\n</style>\n<script id="nt-webterm-controls">\n' + keys + '\n' + controls + '\n</script>\n'
    result, count = re.subn(r'(<head\b[^>]*>)', lambda m: m.group(1) + injection, stock, count=1, flags=re.I)
    if count != 1:
        raise RuntimeError('Missing HTML head; refusing to generate a broken frontend.')
    return result


def extract(binary):
    server = subprocess.Popen([binary, '--interface', '127.0.0.1', '--port', '17680', '/bin/true'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        for _ in range(60):
            if server.poll() is not None:
                raise RuntimeError('Temporary ttyd server exited before extraction.')
            try:
                request = urllib.request.Request('http://127.0.0.1:17680/', headers={'Accept-Encoding': 'identity'})
                with opener.open(request, timeout=1) as response:
                    if response.status != 200:
                        raise RuntimeError('Unexpected frontend response.')
                    data = response.read()
                    if data.startswith(b'\x1f\x8b'):
                        data = gzip.decompress(data)
                    return data.decode('utf-8')
            except urllib.error.URLError:
                time.sleep(0.05)
        raise RuntimeError('Timed out waiting for ttyd frontend.')
    finally:
        server.terminate()
        try:
            server.wait(timeout=3)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait()


def main():
    args = argparse.ArgumentParser()
    args.add_argument('--stock', type=Path, help='Use an extracted stock page for offline tests.')
    args.add_argument('--binary', default='ttyd')
    args.add_argument('--assets', type=Path, default=Path('web'))
    args.add_argument('--output', type=Path, required=True)
    options = args.parse_args()
    stock = options.stock.read_text(encoding='utf-8') if options.stock else extract(options.binary)
    output = enhance(stock, options.assets)
    options.output.parent.mkdir(parents=True, exist_ok=True)
    options.output.write_text(output, encoding='utf-8', newline='\n')
    print('Generated enhanced self-contained ttyd frontend:', options.output)


if __name__ == '__main__':
    main()
