"""Prepare a private Laravel tree and public_html without packaging local secrets."""
from pathlib import Path
import hashlib,json,shutil,sys,zipfile

root=Path(__file__).resolve().parents[1]
base=root.parent
stage=base/'sam-webapp-hostinger-package-2026-10-29'
source=base/'sam-webapp-source-package-2026-10-29'
outputs=base/'outputs';outputs.mkdir(exist_ok=True)

def copy_tree(src,dst):
    shutil.copytree(src,dst,dirs_exist_ok=True,ignore=shutil.ignore_patterns('.DS_Store','__pycache__','*.pyc'))

def prepare():
    if stage.exists() or source.exists():
        raise SystemExit('Package staging already exists; review it before creating a new package.')
    private=stage/'sam-app';public=stage/'public_html';private.mkdir(parents=True);source.mkdir()
    production_dirs=['app','bootstrap','config','database/migrations','database/seeders','resources','routes']
    for name in production_dirs:
        copy_tree(root/name,private/name)
    for name in ['bootstrap/cache','storage/app/public','storage/app/private','storage/framework/cache/data','storage/framework/sessions','storage/framework/views','storage/logs','public']:
        (private/name).mkdir(parents=True,exist_ok=True)
    for file in (private/'bootstrap/cache').glob('*.php'):file.unlink()
    for name in ['artisan','composer.json','composer.lock','.env.example']:
        shutil.copy2(root/name,private/name)
    shutil.copy2(root/'deployment/.env.hostinger.example',private/'.env.hostinger.example')
    (private/'.htaccess').write_text('Require all denied\n')
    for name in ['assets','build']:
        copy_tree(root/'public'/name,public/name)
    for name in ['.htaccess','sw.js','offline-fallback.html']:
        shutil.copy2(root/'public'/name,public/name)
    shutil.copy2(root/'deployment/hostinger-index.php',public/'index.php')
    shutil.copy2(root/'deployment/hostinger.user.ini',public/'.user.ini')
    shutil.copy2(root/'deployment/HOSTINGER-SETUP.md',stage/'HOSTINGER-SETUP.md')
    for name in ['app','bootstrap','config','database/migrations','database/seeders','database/factories','resources','routes','tests','tests-js','scripts','deployment']:
        copy_tree(root/name,source/name)
    for name in ['artisan','composer.json','composer.lock','package.json','pnpm-lock.yaml','.npmrc','.env.example','.gitignore','vite.config.js','phpunit.xml','README.md','CONTINUE-WEBAPP.md','IMPLEMENTATION-PLAN.md']:
        shutil.copy2(root/name,source/name)
    for file in (source/'bootstrap/cache').glob('*.php'):file.unlink()
    for name in ['public/assets','public/build']:
        copy_tree(root/name,source/name)
    for name in ['.htaccess','index.php','sw.js','offline-fallback.html']:
        shutil.copy2(root/'public'/name,source/'public'/name)
    for name in ['storage/app/public','storage/app/private','storage/framework/cache/data','storage/framework/sessions','storage/framework/views','storage/logs','bootstrap/cache']:
        folder=source/name;folder.mkdir(parents=True,exist_ok=True);(folder/'.gitignore').write_text('*\n!.gitignore\n')
    print(json.dumps({'stage':str(stage),'source':str(source),'next':'Install production Composer dependencies in sam-app; then run with --zip.'}))

def archive():
    for folder,title in [(stage,'SAM-Automobiles-Laravel-Hostinger.zip'),(source,'SAM-Automobiles-React-Tailwind-Laravel-Source.zip')]:
        if not folder.exists():raise SystemExit('Prepare the package first.')
        forbidden=[]
        for file in folder.rglob('*'):
            rel=file.relative_to(folder)
            if file.is_symlink():forbidden.append(str(rel))
            if file.name in ['.env','database.sqlite','preview-access.json','hot'] or '.git' in rel.parts or 'node_modules' in rel.parts or 'qa' in rel.parts:
                forbidden.append(str(rel))
        if forbidden:raise SystemExit('Forbidden package files: '+repr(forbidden))
        if folder==stage:
            assert (folder/'sam-app/vendor/autoload.php').is_file()
            assert not (folder/'sam-app/vendor/phpunit').exists()
            assert not (folder/'sam-app/vendor/laravel/boost').exists()
            assert not (folder/'public_html/.env').exists()
        manifest={str(p.relative_to(folder)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(folder.rglob('*')) if p.is_file() and p.name!='PACKAGE-SHA256.json'}
        (folder/'PACKAGE-SHA256.json').write_text(json.dumps(manifest,indent=2)+'\n')
        target=outputs/title
        with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
            for file in sorted(folder.rglob('*')):
                if file.is_file():z.write(file,file.relative_to(folder))
                elif not any(file.iterdir()):z.write(file,str(file.relative_to(folder))+'/')
        with zipfile.ZipFile(target) as z:assert z.testzip() is None
        print(json.dumps({'path':str(target),'bytes':target.stat().st_size,'files':len(manifest),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}))

if __name__=='__main__':
    archive() if '--zip' in sys.argv else prepare()
