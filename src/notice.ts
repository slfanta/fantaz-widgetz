import {connectNotifications} from '@fantaz/widgetz/tauri';
import './host.css';
void connectNotifications(document.getElementById('app')!).catch(error=>{console.error('Fantaz notification initialization failed',error);});
