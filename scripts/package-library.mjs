import {copyFileSync,mkdirSync} from 'node:fs';
copyFileSync('LICENSE','packages/widgetz/dist/LICENSE');
copyFileSync('README.md','packages/widgetz/dist/README.md');
mkdirSync('packages/widgetz/dist/docs',{recursive:true});
for(const doc of ['QUICK_START.md','INTEGRATION.md','API.md','FTZML.md']){
 copyFileSync(`docs/${doc}`,`packages/widgetz/dist/docs/${doc}`);
}
mkdirSync('packages/widgetz/dist/public/templates',{recursive:true});
copyFileSync('public/templates/connection-monitor.ftzml','packages/widgetz/dist/public/templates/connection-monitor.ftzml');

copyFileSync('docs/ON_OFF_CONTROL.md','packages/widgetz/dist/ON_OFF_CONTROL.md');
