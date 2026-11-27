"""Replica o 'Código Básico do IDS - 2025.R' do CNJ.

Uso: python -I ids_cnj.py <csv> [saida.json]
Imprime o IDS dos TRFs por ano e os limites (mín/máx nacionais) de cada indicador.
"""
import csv
import json
import math
import sys

CSV = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else None

SAI = {"TRE", "TJ", "TRF1_2º Grau", "TRF2_2º Grau", "TRF3_2º Grau", "TRF4_2º Grau", "TRF5_2º Grau", "TRF6_2º Grau",
       "TRF1_SJAM", "TRF2_SJRJ", "TRF4_SJSC", "TRF4_SJPR", "TRF4_SJRS", "TRF1_SJAC", "TRF1_SJAP", "TRF1_SJBA",
       "TRF1_SJDF", "TRF1_SJRR", "TRF1_SJRO", "TRF1_SJPI", "TRF1_SJMG", "TRF1_SJMT", "TRF1_SJMA", "TRF1_SJGO",
       "TRF1_SJTO", "TRF5_SJAL", "TRF5_SJSE", "TRF5_SJPE", "TRF5_SJCE", "TRF5_SJRN", "TRF5_SJPB", "TRF2_SJES",
       "TRF3_SJSP", "TRF3_SJMS", "TRF", "TJM", "PJ", "TRT", "Sup/Con", "TRF1_SJPA"}

W = [1.71062271062271] * 4 + [0.549450549450549, 0.964285714285714, 0.549450549450549, 0.964285714285714,
                             0.549450549450549, 0.964285714285714, 0.343864468864469, 0.343864468864469,
                             0.964285714285714, 0.964285714285714]
VARS = ["cre", "crem2", "cra", "cram2", "upv", "cc.ftt", "gtransm2", "gp.ftt", "tmr.ftt", "ced.ftt",
        "glinha.ftt", "qei.ftt", "Pservcf"]
MAIOR = {"upv", "tmr.ftt", "Pservcf"}


def num(v):
    try:
        x = float(str(v).replace(",", "."))
        return x if math.isfinite(x) else None
    except ValueError:
        return None


def div(a, b):
    if a is None or b is None or b == 0:
        return None
    return a / b


rows = list(csv.DictReader(open(CSV, encoding="latin1"), delimiter=";"))


def indicators(r):
    g = lambda k: num(r.get(k))
    cee, kwhi, red, ftt = g("cee"), g("kwhi"), g("redgee3"), g("ftt")
    ej = red if (kwhi is None or kwhi <= 0) else kwhi
    cee2 = None if cee is None or ej is None else max(0.0, cee - ej)
    if kwhi is None:  # R: ifelse(NA<=0, ...) -> NA
        cee2 = None
    qve = g("qve")
    trans = [g(k) for k in ("gcm", "gmv", "gcv", "gc", "got")]
    paper = None if g("gcgraf") is None or g("gpp") is None else g("gcgraf") + g("gpp")
    rec = [g(k) for k in ("tmr", "dpb", "dimp", "del")]
    tel = None if g("gtf") is None or g("gtm") is None else g("gtf") + g("gtm")
    return {
        "cre": div(cee2, ftt), "crem2": div(cee2, g("mtotal")), "cra": div(g("ca"), ftt), "cram2": div(g("ca"), g("mtotal")),
        "upv": None if qve == 0 else div(ftt, qve), "cc.ftt": div(g("cc"), ftt),
        "gtransm2": None if None in trans else div(sum(trans), g("areakm")),
        "gp.ftt": div(paper, ftt), "tmr.ftt": None if None in rec else div(sum(rec), ftt),
        "ced.ftt": div(g("ced"), ftt), "glinha.ftt": div(tel, ftt), "qei.ftt": div(g("qei"), ftt),
        "Pservcf": g("Pservcf"), "Pdesembpf": g("Pdesembpf"),
    }


result = {}
for ano in range(2021, 2026):
    base = [r for r in rows if r["periodicidade"] == "Anual" and r["ano"] == str(ano)]
    allrows = {r["tribunal"]: (r, indicators(r)) for r in base}
    pool = {t: v for t, v in allrows.items() if t not in SAI}
    lim = {}
    for k in VARS:
        vals = [v[1][k] for v in pool.values() if v[1][k] is not None]
        lim[k] = (min(vals), max(vals), len(vals)) if vals else None

    def ids(r, ind):
        u = []
        for k in VARS:
            x, l = ind[k], lim[k]
            if x is None or l is None or l[1] == l[0]:
                return None, None
            s = (x - l[0]) / (l[1] - l[0])
            u.append(s if k in MAIOR else 1 - s)
        p = ind["Pdesembpf"]
        pd = 0 if p is None else (1 if p >= 0.4 else p)
        if r["justica"] in ("Estadual", "Federal", "Trabalho"):
            return sum(a * b for a, b in zip(u + [pd], W)) / sum(W), u + [pd]
        return sum(a * b for a, b in zip(u, W[:13])) / sum(W[:13]), u

    out = {}
    for t, (r, ind) in allrows.items():
        v, u = ids(r, ind)
        out[t] = {"ids": v, "justica": r["justica"], "inputs": ind, "uni": u}
    result[ano] = {"limits": {k: lim[k] for k in VARS}, "n_pool": len(pool), "ids": out}
    feds = sorted([(t, d["ids"]) for t, d in out.items() if t.startswith("TRF") and "_" not in t and t in pool], key=lambda x: -(x[1] or -1))
    print(ano, "pool", len(pool), " ", "  ".join(f"{t} {v*100:.2f}%" if v is not None else f"{t} n.d." for t, v in feds))
    if ano == 2025:
        for k in VARS:
            print(f"   {k:11s} min={lim[k][0]:.6g}  max={lim[k][1]:.6g}  n={lim[k][2]}")
        for t in ("TRF1", "TRE-RR", "TJAM", "CNJ"):
            if t in out and out[t]["ids"] is not None:
                print(f"   {t}: {out[t]['ids']*100:.2f}%")

if OUT:
    json.dump(result, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1, default=str)
