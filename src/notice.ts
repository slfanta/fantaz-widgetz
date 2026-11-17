import {connectNotifications} from '@fantaz/widgetz/tauri';
import '@fantaz/widgetz/style.css';import './host.css';
void connectNotifications(document.getElementById('app')!).catch(error=>{console.error('Fantaz notification initialization failed',error);});
