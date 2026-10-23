"""Deterministic, standard-library XLSX export. Never writes the source workbook."""
from pathlib import Path
import hashlib,json,sys,zipfile,posixpath,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
p=next((ROOT/'packages/game-data/source').glob('*.xlsx'))
ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(p) as z:
    strings=[]
    if 'xl/sharedStrings.xml' in z.namelist():
        strings=[''.join(t.text or '' for t in e.findall('.//s:t',ns)) for e in ET.fromstring(z.read('xl/sharedStrings.xml'))]
    rels={r.attrib['Id']:r.attrib['Target'] for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
    sheets={}
    for sheet in ET.fromstring(z.read('xl/workbook.xml')).find('s:sheets',ns):
        target=rels[sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]
        target=target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/'+target)
        rows=[]
        for row in ET.fromstring(z.read(target)).findall('.//s:row',ns):
            values={}
            for c in row:
                v=c.find('s:v',ns);value=v.text if v is not None else ''
                if c.attrib.get('t')=='s':value=strings[int(value)]
                elif c.attrib.get('t')=='inlineStr':value=''.join(t.text or '' for t in c.findall('.//s:t',ns))
                if value:values[''.join(filter(str.isalpha,c.attrib['r']))]=value
            if values:rows.append({'row':int(row.attrib['r']), 'cells':values})
        sheets[sheet.attrib['name']]=rows

def rows(name):return (r['cells'] for r in sheets[name])
ores=[{'id':r['A'],'name':r['B'],'rarity':r['C'],'rate':float(r['D']),'bookValue':float(r['E']),'refinedName':r['F'],'input':int(r['G']),'minutes':float(r['H'])} for r in rows('资源与配方') if r.get('A','').startswith('ORE_')]
ships=[{'id':r['A'],'size':r['B'],'role':r['C'],'grade':r['D'],'release':r['E'],'hp':int(r['F']),'armor':int(r['G']),'speed':float(r['H']),'cargo':int(r['I']),'weaponSlots':int(r['J']),'plateSlots':int(r['K']),'armorType':r['L'],'buildHours':float(r['M']),'credits':int(r['N']),'repairScore':int(r['O']),'recipe':r['P'],'rating':int(r['Q'])} for r in rows('舰船') if r.get('A','').startswith('HULL_')]
levels=[{'level':int(r['A']),'nextXP':int(r['B']),'totalXP':int(r['C']),'planetCap':int(r['D']),'shipCap':int(r['E'])} for r in rows('成长与容量') if r.get('A','').isdigit() and 1<=int(r['A'])<=30]
for items in [ores,ships]:
    ids=[x['id'] for x in items]
    if len(ids)!=len(set(ids)):raise ValueError('Duplicate stable IDs')
if len(ores)!=10 or len(ships)!=27 or len(levels)!=30:raise ValueError('Unexpected authority table shape')
for ore in ores:
    if ore['rate']<=0 or ore['input']<=0:raise ValueError('Invalid resource rate')
for ship in ships:
    if ship['weaponSlots']<=0 or ship['hp']<=0:raise ValueError('Invalid hull')
output={'dataVersion':'data-1.0.0-import.1','sourceSHA256':hashlib.sha256(p.read_bytes()).hexdigest(),'ores':ores,'ships':ships,'levels':levels,'sheets':sheets}
content=json.dumps(output,ensure_ascii=False,indent=2)+'\n'
out=ROOT/'packages/game-data/snapshot.json'
catalog=ROOT/'packages/game-data/ores.json'
catalog_content=json.dumps(ores,ensure_ascii=False,indent=2)+'\n'
if '--check' in sys.argv:
    if not out.exists() or out.read_text()!=content or not catalog.exists() or catalog.read_text()!=catalog_content:raise SystemExit('Data snapshot differs: run npm run data:export')
    print('Authoritative snapshot verified: 11 sheets, 10 ores, 27 hulls, 30 levels')
else:
    out.write_text(content);catalog.write_text(catalog_content);print('Exported',out)
