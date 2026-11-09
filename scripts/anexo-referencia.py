"""Gera data/reference/anexo-res400.json: informação oficial do Anexo por sigla de indicador do iPLS."""
import json
import re
import sys
import unicodedata

anexo = json.load(open(sys.argv[1], encoding='utf-8'))
ipls = json.load(open(sys.argv[2], encoding='utf-8'))
out_path = sys.argv[3]

for a in anexo:
    if a['code'] == '21.1':
        a['acronym'] = 'RDC'
        a['name'] = re.sub(r'\s*\(RDC\)\s*$', '', a['name'])
    if a['code'] == '6.5':
        a['acronym'] = None
    if a['acronym'] == 'Dlmp':  # leitura do PDF (l no lugar de I)
        a['acronym'] = 'DImp'


def norm(s):
    s = unicodedata.normalize('NFKD', (s or '').lower())
    return re.sub(r'[^a-z0-9²]+', '', ''.join(c for c in s if not unicodedata.combining(c)))


by_item = {norm(a['acronym']): a for a in anexo if a['acronym']}
by_code = {a['code']: a for a in anexo}
by_var = {}
for a in anexo:
    for v in a['variables']:
        by_var.setdefault(norm(v['acronym']), (a, v))

# Siglas do iPLS que diferem das do Anexo (mesmo conceito)
ITEM_ALIAS = {'dei/del': 'dei', 'm²total': 'm²total', 'm²cont': 'm²cont'}
VAR_ALIAS = {'vhib': ('20.3.4', 'VAltH'), 'aincent': ('20.5.2', 'AInc'), 'geecomp': ('20.4.3', 'GEEComp'),
             'gee-comp': ('20.4.3', 'GEEComp'), 'gee1e2': ('20.2.5', 'GEE1e2'), 'msedeinv': ('20.2.2', 'MSedeInv'),
             'servcinv': ('20.5.1', 'ServCI'), 'gee-esc3': ('20.2.5', 'GEE3')}


def item_info(a):
    return {
        'kind': 'ITEM', 'item': a['code'], 'acronym': a['acronym'], 'title': a['name'],
        'definition': a['definition'], 'unit': a['unit'], 'periodicity': a['periodicity'],
        'plsJud': a['plsjud'], 'formula': a['formula'] or None,
        'variables': a['variables'] or None, 'amendments': a['amendments'] or None
    }


def find_var(item_code, acr):
    a = by_code[item_code]
    v = next((x for x in a['variables'] if norm(x['acronym']) == norm(acr)), None)
    return a, v


ref, report = {}, []
for i in ipls:
    acr = i.get('acronym') or ''
    k = norm(acr)
    info = None
    if i['name'].lower().startswith('uso de energia'):
        info = item_info(by_code['6.5'])
    elif k in VAR_ALIAS or acr.lower() in VAR_ALIAS:
        code, vacr = VAR_ALIAS.get(acr.lower()) or VAR_ALIAS[k]
        a, v = find_var(code, vacr)
        if v:
            info = {'kind': 'VARIAVEL', 'item': a['code'], 'acronym': v['acronym'], 'title': v['text'].split(':')[0][:120],
                    'definition': v['text'], 'parent': {'item': a['code'], 'acronym': a['acronym'], 'title': a['name'],
                                                        'formula': a['formula'] or None, 'unit': a['unit'],
                                                        'periodicity': a['periodicity']}}
    else:
        a = by_item.get(norm(ITEM_ALIAS.get(acr.lower(), acr)))
        if a:
            info = item_info(a)
        elif k in by_var:
            a, v = by_var[k]
            info = {'kind': 'VARIAVEL', 'item': a['code'], 'acronym': v['acronym'], 'title': v['text'].split(':')[0][:120],
                    'definition': v['text'], 'parent': {'item': a['code'], 'acronym': a['acronym'], 'title': a['name'],
                                                        'formula': a['formula'] or None, 'unit': a['unit'],
                                                        'periodicity': a['periodicity']}}
    if not info:
        info = {'kind': 'FORA'}
    ref[acr or i['name']] = info
    report.append((i['code'], acr, info['kind'], info.get('item')))

# Referência à norma
doc = {
    'source': 'Anexo da Resolução CNJ nº 400/2021, redação dada pelas Resoluções nº 550/2024, nº 594/2024 e nº 641/2025',
    'indicators': ref
}
json.dump(doc, open(out_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
from collections import Counter
print(Counter(r[2] for r in report))
print('FORA:', [r[:2] for r in report if r[2] == 'FORA'])
