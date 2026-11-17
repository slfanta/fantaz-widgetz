import {copyFileSync} from 'node:fs';
copyFileSync('packages/widgetz/src/style.css','packages/widgetz/dist/style.css');
copyFileSync('LICENSE','packages/widgetz/dist/LICENSE');
copyFileSync('README.md','packages/widgetz/dist/README.md');
