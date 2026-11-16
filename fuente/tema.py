"""Tema visual: hoja de estilo nueva + íconos del menú (solo apariencia)."""
import re, pathlib

HERE = pathlib.Path(__file__).parent

_P = {
    'inicio': '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    'pedidos': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h5"/>',
    'grupales': '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18 14.6a6.5 6.5 0 0 1 3.5 5.4"/>',
    'individuales': '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>',
    'aereos': '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
    'pasajeros': '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.2"/><path d="M5.8 16a3.4 3.4 0 0 1 6.4 0"/><path d="M15 10h3M15 14h3"/>',
    'reservas': '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="m9 13 2 2 4-4"/>',
    'cobros': '<path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    'tesoreria': '<path d="M3 20h18"/><rect x="5" y="11" width="3" height="6" rx=".5"/><rect x="10.5" y="7" width="3" height="10" rx=".5"/><rect x="16" y="4" width="3" height="13" rx=".5"/>',
    'bitacora': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    'proveedores': '<path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M16 9h2a2 2 0 0 1 2 2v10"/><path d="M8 7h4M8 11h4M8 15h4M3 21h18"/>',
    'caja': '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9.5v5M18 9.5v5"/>',
    'informes': '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 17v-3M12 17v-6M16 17v-2"/>',
}

def icon(page):
    return ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + _P[page] + '</svg>')

# Secciones del menú lateral (antes de qué botón va cada título)
_SECCIONES = {'inicio': ('Ventas', ''), 'pasajeros': ('Clientes', ''), 'tesoreria': ('Administración', ' admin')}

def aplicar(html):
    """Recibe el HTML (parte previa al script principal) y devuelve el HTML con el tema aplicado."""
    # Menú lateral: ícono SVG + títulos de sección
    nav = re.search(r'<nav class="nav">(.*?)</nav>', html, flags=re.S)
    assert nav, 'No se encontró el menú lateral'
    def lateral(m):
        attrs, page, label = m.group(1), m.group(2), m.group(3)
        sec = _SECCIONES.get(page)
        pre = f'<div class="nav-label{sec[1]}">{sec[0]}</div>' if sec else ''
        return f'{pre}<button{attrs}>{icon(page)}<span>{label}</span></button>'
    new_nav = re.sub(r'<button([^>]*data-page="([a-z]+)"[^>]*)>[^<&]*&nbsp;\s*([^<]+)</button>', lateral, nav.group(1))
    assert new_nav.count('<svg') == nav.group(1).count('<button'), 'Faltan íconos en el menú lateral'
    html = html.replace(nav.group(0), '<nav class="nav">' + new_nav + '</nav>', 1)

    # Menú inferior del celular
    mob = re.search(r'<div class="mobile-nav">(.*?)</div>', html, flags=re.S)
    assert mob, 'No se encontró el menú del celular'
    new_mob = re.sub(r'<button([^>]*data-page="([a-z]+)"[^>]*)>[^<]*<br>([^<]+)</button>',
                     lambda m: f'<button{m.group(1)}>{icon(m.group(2))}{m.group(3)}</button>', mob.group(1))
    assert new_mob.count('<svg') == mob.group(1).count('<button'), 'Faltan íconos en el menú del celular'
    html = html.replace(mob.group(0), '<div class="mobile-nav">' + new_mob + '</div>', 1)

    # Hoja de estilo (al final del <head>, para que tenga prioridad)
    html = html.replace('</head>', (HERE / 'src' / 'tema.css').read_text(encoding='utf-8') + '</head>', 1)
    return html
