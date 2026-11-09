"""Extrai o Anexo compilado da Res. CNJ 400/2021 (redação 2024/2025) com definições, fórmulas e variáveis."""
import json
import re
import sys

src, out = sys.argv[1], sys.argv[2]
raw = open(src, encoding='utf-8').read().replace(' ', ' ')
lines = [l.rstrip() for l in raw.split('\n')]
start = next(i for i, l in enumerate(lines) if re.match(r'^\s*1\.1\s+MagP', l))
lines = lines[start:]

NOTE = re.compile(r'\((?:incluíd[oa]|redação dada|revogad[oa])[^)]*\)', re.I)
ITEM = re.compile(r'^\s*(\d{1,2})\.(\d{1,2})(?:\.(\d{1,2}))?\.?\s+'
                  r'(m2\s*(?:Total|Cont)|[A-Za-z][A-Za-z0-9²]{0,14})\s*[–-]\s+(.+)$')
ITEM_NOACR = re.compile(r'^\s*(6)\.(5)\s+(Uso de energia alternativa)\s*$')
ITEM_21 = re.compile(r'^\s*(21)\.(1)\.?\s+Indicador:\s*(.+)$')
GROUP = re.compile(r'^\s*20\.\d\.?\s+Indicadores de ')
LABELS = [('definition', r'Definição\s*:'), ('unit', r'Unidade de medida\s*:'),
          ('periodicity', r'Periodicidade d[ae] apuração\s*:'), ('plsjud', r'PLS-?Jud\s*:'),
          ('formula', r'Fórmula\s*:')]
BULLET = re.compile(r'^\s*[•·▪o]\s+(.*)$')
VAR = re.compile(r'^([A-Za-z][A-Za-z0-9²_]{0,14}(?:\s?\d)?)\s*[–:-]\s*(.+)$')

items, cur, field, var = [], None, None, None


def clean(t):
    t = NOTE.sub('', t or '')
    t = re.sub(r'\s+', ' ', t).strip()
    return re.sub(r'\s+([,.;:])', r'\1', t)


def new_item(code, acr, name):
    global cur, field, var
    cur = {'code': code, 'acronym': acr, 'name': name, 'definition': '', 'unit': '', 'periodicity': '',
           'plsjud': '', 'formula': '', 'variables': [], 'amendments': []}
    items.append(cur)
    field, var = 'name', None


for l in lines:
    s = l.strip()
    if not s:
        continue
    for m in re.finditer(r'Resolução n\. (\d+), de [\d.]+', l):
        if cur is not None and m.group(0) not in cur['amendments']:
            cur['amendments'].append(m.group(0))
    m = ITEM.match(l)
    if m and not GROUP.match(l):
        code = '.'.join(g for g in m.group(1, 2, 3) if g)
        acr = re.sub(r'\s+', ' ', m.group(4)).replace('m2 ', 'm²').replace('m2', 'm²')
        new_item(code, acr, m.group(5))
        continue
    m = ITEM_NOACR.match(l) or ITEM_21.match(l)
    if m:
        new_item(f'{m.group(1)}.{m.group(2)}', None, m.group(3))
        continue
    if GROUP.match(l) or re.match(r'^\s*\d{1,2}\.\s*[A-ZÁÉÍÓÚÂÊÔÃÕÇ“"]', l):
        field = None  # cabeçalho de tema/grupo
        continue
    if cur is None:
        continue
    lab = next(((k, re.match(p, s, re.I)) for k, p in LABELS if re.match(p, s, re.I)), None)
    if lab:
        field, var = lab[0], None
        cur[field] += ' ' + s[lab[1].end():]
        continue
    b = BULLET.match(l)
    if b and field in ('formula', 'definition', 'var'):
        vm = VAR.match(b.group(1).strip())
        if vm:
            var = {'acronym': vm.group(1).replace(' ', ''), 'text': vm.group(2)}
            cur['variables'].append(var)
            field = 'var'
            continue
    if field == 'var' and var is not None:
        var['text'] += ' ' + s
    elif field:
        cur[field] += ' ' + s

for it in items:
    for k in ('name', 'definition', 'unit', 'periodicity', 'plsjud', 'formula'):
        it[k] = clean(it[k]).rstrip('.').strip() if k != 'definition' else clean(it[k])
    for v in it['variables']:
        v['text'] = clean(v['text']).rstrip(';').strip()
    # nome que "vazou" para a linha seguinte termina antes de "Definição"
    it['name'] = re.sub(r'\s+Definição.*$', '', it['name'])

json.dump(items, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
from collections import Counter
print(len(items), 'itens;', sum(len(i['variables']) for i in items), 'variáveis')
print(Counter(i['code'].split('.')[0] for i in items))
print('sem definição:', [i['code'] for i in items if not i['definition']][:20])
print('sem unidade:', [i['code'] for i in items if not i['unit']][:20])
