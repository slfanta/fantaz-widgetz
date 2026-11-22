/** Browser-only visual preview. No queue, native window or download effects. */
import {mount} from '@fantaz/widgetz';
import './host.css';
import {createResultPad} from './create-result-pad';

const target = document.getElementById('notice-root')!;
const outcome = new URLSearchParams(location.search).get('outcome') === 'failure' ? 'failure' : 'success';
const view = mount(target);
view.update(createResultPad({
  id: 'reference-preview', outcome, appName: 'Your downloader', title: 'example-video.mp4',
  detail: outcome === 'success' ? 'Saved and validated' : 'Request timed out; retained parts are available',
}));
view.onAction(action => {if (action === 'dismiss') target.hidden = true;});
window.addEventListener('pagehide', () => view.destroy(), {once: true});
