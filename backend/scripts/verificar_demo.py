"""
Comprueba, contra la API en ejecucion, que la base de demo esta en condiciones.

Correlo antes de exponer, con el backend levantado:

    backend/venv/bin/python backend/scripts/verificar_demo.py

Sale con codigo 1 si alguna verificacion falla.
"""
import json
import sys
import urllib.error
import urllib.request

BASE = "http://localhost:8000"
USERS = {
    "alumno": (45123456, "alumno123"),
    "docente": (24876543, "docente123"),
    "departamento": (20345678, "depto123"),
    "admin": (35111222, "admin123"),
}

fallos = []


def call(path, token=None, method="GET", body=None):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:300]


def check(label, ok, detail=""):
    print(f"  {'OK  ' if ok else 'FALLA'}  {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        fallos.append(label)


tokens = {}
print("\n== Login por rol ==")
for rol, (dni, pwd) in USERS.items():
    st, data = call("/auth/login", method="POST", body={"dni": dni, "password": pwd})
    ok = st == 200 and "access_token" in data
    if ok:
        tokens[rol] = data["access_token"]
    check(f"login {rol} (DNI {dni})", ok, f"HTTP {st}")

print("\n== ALUMNO ==")
t = tokens.get("alumno")
st, pend = call("/encuestas-asignaturas/pendientes", t)
check("encuestas pendientes > 0", st == 200 and len(pend) > 0,
      f"{len(pend) if st == 200 else st} pendientes")
if st == 200 and pend:
    for e in pend:
        a = e["asignatura"]
        npreg = sum(len(v["preguntas"]) for v in e["encuesta_base"]["variables"])
        print(f"          id={e['id']}  {a['nombre']}  [{e['fecha_inicio']} -> {e['fecha_fin']}]  "
              f"{len(e['encuesta_base']['variables'])} variables / {npreg} preguntas")
    primera = pend[0]
    todas_con_opciones = all(
        len(p["pregunta_opcion"]) > 0
        for v in primera["encuesta_base"]["variables"] for p in v["preguntas"]
    )
    check("todas las preguntas tienen opciones", todas_con_opciones)

st, resp = call("/encuestas-asignaturas/alumno/1", t)
check("historial de encuestas respondidas", st == 200 and len(resp) > 0,
      f"{len(resp) if st == 200 else st} respondidas")

print("\n== DOCENTE ==")
t = tokens.get("docente")
st, reps = call("/reportes/disponibles", t)
check("reportes disponibles > 0", st == 200 and len(reps) > 0,
      f"{len(reps) if st == 200 else st} reportes")
rid = None
if st == 200 and reps:
    for r in reps:
        print(f"          reporte id={r['id']}  informe={r.get('has_informe')}  "
              f"respondido={r.get('has_respuesta')}")
    pendientes = [r for r in reps if not r.get("has_respuesta")]
    check("hay al menos 1 reporte sin informe (para la demo en vivo)", len(pendientes) > 0)
    rid = pendientes[0]["id"] if pendientes else reps[0]["id"]

st, full = call("/reportes/", t)
if st == 200 and full:
    r0 = next((r for r in full if r["id"] == rid), full[0])
    ea = r0["encuesta_asignatura"]
    check("reporte trae ciclo_lectivo del anio corriente",
          ea["ciclo_lectivo"] == 2026, f"ciclo={ea['ciclo_lectivo']}")
    check("reporte trae respuestas", len(ea["respuestas"]) > 0,
          f"{len(ea['respuestas'])} respuestas")
    check("asignatura trae carrera anidada", ea["asignatura"].get("carrera") is not None)
    check("cursado es 'cuatrimestre 1'", ea["asignatura"]["cursado"] == "cuatrimestre 1",
          ea["asignatura"]["cursado"])

st, gen = call(f"/reportes/generar/{rid}", t)
ok = st == 200 and gen.get("resumen_por_variable")
check("/reportes/generar devuelve resumen", bool(ok), f"HTTP {st}")
if ok:
    print(f"          variables en el resumen: {list(gen['resumen_por_variable'].keys())}")
    rpp = gen.get("resultados_por_pregunta") or {}
    check("resultados_por_pregunta no vacio", len(rpp) > 0, f"{len(rpp)} variables")
    # Las opciones deben coincidir con la tabla WEIGHTS del front.
    pesos = {"si", "no", "npo | no puedo opinar", "suficientes", "escasos",
             "más de 50%", "entre 0 y 50%", "1", "2", "3", "4", "una", "más de una"}
    textos = set()
    for v in gen["resumen_por_variable"].values():
        for op in v.get("opciones", []):
            textos.add(str(op.get("opcion_texto", "")).lower())
    desconocidas = textos - pesos
    check("todas las opciones estan en la tabla WEIGHTS del front",
          not desconocidas, f"fuera de tabla: {sorted(desconocidas)}" if desconocidas else "")

st, comp = call(f"/reportes/{rid}/comparativa/2025")
check("comparativa interanual 2025 devuelve datos",
      st == 200 and isinstance(comp, dict) and len(comp) > 0,
      f"HTTP {st}, {len(comp) if isinstance(comp, dict) else '?'} variables")

st, base = call("/informes-curriculares-base/actual", t)
check("plantilla de informe curricular disponible",
      st == 200 and len(base.get("preguntas", [])) > 0,
      f"{len(base.get('preguntas', [])) if st == 200 else st} preguntas")

print("\n== DEPARTAMENTO ==")
t = tokens.get("departamento")
st, infs = call("/informes-asignaturas/", t)
cerrados = [i for i in infs if i.get("estado") == "cerrado"] if st == 200 else []
check("informes curriculares cerrados > 0", len(cerrados) > 0, f"{len(cerrados)} cerrados")
if cerrados:
    porc = {}
    for i in cerrados:
        c = i["asignatura"]["carrera"]["nombre"]
        porc[c] = porc.get(c, 0) + 1
    print(f"          por carrera: {porc}")

st, sint = call("/informe-sintetico-carrera/", t)
check("informes sinteticos existentes", st == 200, f"{len(sint) if st == 200 else st}")
if st == 200:
    con_resp = [s for s in sint if s.get("respuesta")]
    check("al menos 1 sintetico ya presentado", len(con_resp) > 0, f"{len(con_resp)} con respuesta")
    carreras_con_sint = {s["id_carrera"] for s in con_resp}
    lic = [i for i in cerrados if i["asignatura"]["carrera"]["nombre"] == "Licenciatura en Sistemas"]
    if lic:
        id_lic = lic[0]["asignatura"]["carrera"]["id"]
        check("Lic. en Sistemas SIN sintetico (queda para la demo en vivo)",
              id_lic not in carreras_con_sint)

st, sbase = call("/informes-sinteticos-base/actual", t)
check("plantilla de informe sintetico disponible",
      st == 200 and len(sbase.get("preguntas", [])) > 0,
      f"{len(sbase.get('preguntas', [])) if st == 200 else st} preguntas")

print("\n== ESTADISTICAS (dashboard departamento) ==")
st, dash = call("/estadisticas/dashboard?ciclo=2026")
check("dashboard 2026 responde", st == 200, f"HTTP {st}")
if st == 200:
    for ind in dash.get("indicadores", []):
        print(f"          {ind.get('titulo')}: {ind.get('valor')}")
    check("hay dimensiones", len(dash.get("dimensiones", [])) > 0)
    check("hay valoraciones", len(dash.get("valoraciones", [])) > 0)
    check("hay top de asignaturas", len(dash.get("top_asignaturas", [])) > 0)
    alertas = dash.get("alertas", [])
    check("hay alertas generadas", len(alertas) > 0, f"{len(alertas)} alertas")
    for a in alertas:
        print(f"          [{a.get('severidad')}] {a.get('tipo')} — {a.get('asignatura')}: {a.get('detalle')}")
    kw = dash.get("keywords", [])
    check("hay keywords de respuestas abiertas", len(kw) > 0,
          ", ".join(str(k if isinstance(k, str) else (k.get("texto") or k.get("palabra"))) for k in kw[:6]))

print("\n== CURSADAS (para el contador de inscriptos) ==")
st, curs = call("/cursadas/", tokens.get("docente"))
check("/cursadas/ accesible", st == 200, f"{len(curs) if st == 200 else st} cursadas")

print()
if fallos:
    print(f"RESULTADO: {len(fallos)} verificaciones fallaron:")
    for f in fallos:
        print(f"  - {f}")
    sys.exit(1)
print("RESULTADO: todas las verificaciones pasaron.")
