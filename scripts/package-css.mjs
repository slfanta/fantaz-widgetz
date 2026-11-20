import {copyFileSync,mkdirSync} from 'node:fs';
copyFileSync('packages/widgetz/src/style.css','packages/widgetz/dist/style.css');
copyFileSync('LICENSE','packages/widgetz/dist/LICENSE');
copyFileSync('README.md','packages/widgetz/dist/README.md');
mkdirSync('packages/widgetz/dist/docs',{recursive:true});
for(const doc of ['QUICK_START.md','INTEGRATION.md']){
 copyFileSync(`docs/${doc}`,`packages/widgetz/dist/docs/${doc}`);
}

copyFileSync('docs/ON_OFF_CONTROL.md','packages/widgetz/dist/ON_OFF_CONTROL.md');
