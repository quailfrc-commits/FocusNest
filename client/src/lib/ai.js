import { api } from './api.js';
import { fallbackSplit } from './logic.js';

/* AI 任務拆解：後端呼叫 Gemini；沒有金鑰、斷線或回傳格式不對時改用範本 */
export async function aiSplit(title){
  try{
    const r = await api.split(title);
    const list = (r.list || []).filter(x => x && x.title).slice(0, 6)
      .map(x => {
        const minutes = Math.min(480, Math.max(1, Math.round(+x.minutes || (+x.est || 1) * 25)));
        return { title: String(x.title).slice(0, 30), criteria: String(x.criteria || x.doneWhen || '').slice(0, 80), minutes, est: Math.ceil(minutes / 25), on: true };
      });
    if(!list.length) throw new Error('empty');
    return { list, ai: true, model: r.model, receivedAt: r.receivedAt };
  }catch(e){
    return { list: fallbackSplit(title), ai: false, failed: true };
  }
}
