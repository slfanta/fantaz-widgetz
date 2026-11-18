/** Reference composition, not a new library export or native adapter option. */
import {downloadNotice, palette} from '@fantaz/widgetz';
import type {DownloadResult, NoticeOptions, Pad} from '@fantaz/widgetz';

/** Separate title/detail rows matching the 360 × 88 desktop reference. */
export function createResultPad(result: DownloadResult, options: NoticeOptions = {}): Pad {
  const pad = downloadNotice({...result, detail: ''}, {
    ...options,
    opacity: options.opacity ?? 9,
    palette: {...palette, ...options.palette},
  });
  pad.children.splice(3, 0, {
    type: 'row', id: 'detail-row', children: [
      {type: 'text', id: 'detail', content: result.detail, role: 'secondary', overflow: 'roll'},
    ],
  });
  return pad;
}
