#!/usr/bin/env python3
"""Refresh the RBI House Price Index data in src/data/hpi.js.

1. Download "House Price Index" as a spreadsheet from RBI's data portal
   (data.rbi.org.in > Statistics > Real Sector > Prices & Wages).
2. Run:   python3 scripts/update_hpi.py ~/Downloads/"House Price Index Publication.xlsx"
   Optionally add the address of RBI's press release for the new quarter:
          python3 scripts/update_hpi.py file.xlsx https://www.rbi.org.in/...prid=12345
3. Run:   npm test

Uses only Python's standard library — the spreadsheet is read directly as the
zip of XML files it is.
"""
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
TARGET = Path(__file__).resolve().parent.parent / 'src' / 'data' / 'hpi.js'


def read_rows(path):
    """Rows of the first sheet, each a dict of column letter -> value."""
    with zipfile.ZipFile(path) as z:
        shared = []
        if 'xl/sharedStrings.xml' in z.namelist():
            for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS):
                shared.append(''.join(t.text or '' for t in si.iter('{%s}t' % NS['m'])))
        sheet = sorted(n for n in z.namelist() if re.match(r'xl/worksheets/sheet\d+\.xml$', n))[0]
        rows = []
        for row in ET.fromstring(z.read(sheet)).iter('{%s}row' % NS['m']):
            cells = {}
            for c in row.findall('m:c', NS):
                col = re.match(r'[A-Z]+', c.get('r')).group()
                v = c.find('m:v', NS)
                inline = c.find('m:is', NS)
                if c.get('t') == 's' and v is not None:
                    cells[col] = shared[int(v.text)]
                elif inline is not None:
                    cells[col] = ''.join(t.text or '' for t in inline.iter('{%s}t' % NS['m']))
                elif v is not None:
                    try:
                        cells[col] = float(v.text)
                    except ValueError:
                        cells[col] = v.text
            rows.append(cells)
        return rows


def bangalore_series(rows):
    """{base year label: [(quarter, value), ...]} for the Bangalore column."""
    series, base, column = {}, None, None
    for cells in rows:
        texts = {k: v for k, v in cells.items() if isinstance(v, str)}
        label = next((v for v in texts.values() if v.strip().startswith('Base Year')), None)
        if label:
            base, column = re.search(r'(\d{4}-\d{2})', label).group(1), None
            series[base] = []
            continue
        if base and column is None:
            column = next((k for k, v in texts.items() if v.strip().lower() in ('bangalore', 'bengaluru')), None)
            continue
        quarter = next((v for v in texts.values() if re.match(r'Q[1-4]\.\d{4}-\d{2}', v.strip())), None)
        if base and column and quarter and isinstance(cells.get(column), float):
            series[base].append((re.match(r'Q[1-4]\.\d{4}-\d{2}', quarter.strip()).group(), round(cells[column], 2)))
    return series


def js_rows(pairs):
    lines = []
    for i in range(0, len(pairs), 4):
        lines.append('  ' + ' '.join("['%s', %s]," % (q, ('%g' % v)) for q, v in pairs[i:i + 4]))
    return '\n'.join(lines)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    series = bangalore_series(read_rows(sys.argv[1]))
    old, new = series.get('2010-11'), series.get('2022-23')
    if not old or not new:
        sys.exit('Could not find the 2010-11 and 2022-23 Bangalore series in that file. Has RBI changed the layout?')

    text = TARGET.read_text()
    before = re.search(r"export const HPI_NEW = \[\n(.*?)\n\]", text, re.S).group(1).count('[')
    text, n1 = re.subn(r"(export const HPI_OLD = \[\n).*?(\n\])", lambda m: m.group(1) + js_rows(old) + m.group(2), text, flags=re.S)
    text, n2 = re.subn(r"(export const HPI_NEW = \[\n).*?(\n\])", lambda m: m.group(1) + js_rows(new) + m.group(2), text, flags=re.S)
    if n1 != 1 or n2 != 1:
        sys.exit('Could not find the data blocks in src/data/hpi.js.')
    text = re.sub(r"(The latest quarter is provisional when published \()[^)]*(\))", lambda m: m.group(1) + new[-1][0] + m.group(2), text)
    if len(sys.argv) > 2:
        if not sys.argv[2].startswith('https://'):
            sys.exit('The press release address should start with https://')
        text, n3 = re.subn(r"(export const HPI_SOURCE_URL = ')[^']*(')", lambda m: m.group(1) + sys.argv[2] + m.group(2), text)
        if n3 != 1:
            sys.exit('Could not find HPI_SOURCE_URL in src/data/hpi.js.')
    TARGET.write_text(text)
    print('Old series: %d quarters, %s to %s' % (len(old), old[0][0], old[-1][0]))
    print('New series: %d quarters (was %d), %s to %s' % (len(new), before, new[0][0], new[-1][0]))
    print('Updated src/data/hpi.js. Now run: npm test')


if __name__ == '__main__':
    main()
