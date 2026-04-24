#!/usr/bin/env python3
"""
Fetch raw Descript transcripts for the 5 still-deferred pitch voices.
Descript segments are word-level; we group by speaker into paragraphs.
"""

import re
import ssl
import json
import urllib.request
from pathlib import Path

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
CTX = ssl.create_default_context()

TARGETS = [
    ('Nigel Alice',            'https://share.descript.com/view/81eXhBcx1sq'),
    ('Jackquann',              'https://share.descript.com/view/iMkgYckmB6r'),
    ('Laquisha',               'https://share.descript.com/view/upRsPoO2uG8'),
    ('Jay',                    'https://share.descript.com/view/CBFA59vK0Cv'),
    ('Rashad Gavin Isaacson',  'https://share.descript.com/view/8ywPFEnrUp4'),
]


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    return urllib.request.urlopen(req, context=CTX).read().decode('utf-8', errors='ignore')


def find_transcript_url(share_html):
    m = re.search(r'"transcript"\s*:\s*\{\s*"url"\s*:\s*"([^"]+)"', share_html)
    return m.group(1).replace('&amp;', '&') if m else None


def assemble(transcript_json):
    """Group word-level segments into speaker-turn paragraphs."""
    segments = transcript_json.get('segments') or []
    if not segments:
        return '(no segments in transcript)'

    paragraphs = []
    current_speaker = None
    current_words = []

    def flush():
        if current_words:
            text = ' '.join(current_words).replace(' ,', ',').replace(' .', '.').replace(' ?', '?').replace(' !', '!')
            paragraphs.append(f'{current_speaker}: {text}')

    for seg in segments:
        sp = seg.get('speaker', 'Speaker')
        body = seg.get('body', '')
        if sp != current_speaker:
            flush()
            current_speaker = sp
            current_words = [body]
        else:
            current_words.append(body)
    flush()

    return '\n\n'.join(paragraphs)


out = []
out.append('=' * 90)
out.append('DEFERRED CAST — Descript transcripts (raw word-level reassembled)')
out.append('=' * 90)

for name, url in TARGETS:
    out.append('')
    out.append('#' * 90)
    out.append(f'# {name}')
    out.append('#' * 90)
    out.append(f'source: {url}')
    out.append('')

    try:
        html = fetch(url)
        tx_url = find_transcript_url(html)
        if not tx_url:
            out.append('(no transcript url in share page)')
            continue
        tx_json = json.loads(fetch(tx_url))
        out.append(assemble(tx_json))
    except Exception as e:
        out.append(f'ERROR: {e}')

Path('data/pitch/descript-transcripts.txt').write_text('\n'.join(out))
print('Wrote data/pitch/descript-transcripts.txt')
